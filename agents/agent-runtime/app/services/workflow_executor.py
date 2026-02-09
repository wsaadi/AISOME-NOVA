"""
Workflow Executor Service - Executes agent workflows.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime
import re
import json
import asyncio

from ..models import (
    WorkflowExecutionContext,
    StepExecutionResult,
    ExecutionStatus,
    AgentSession,
    MessageRole,
)
from .agent_loader import AgentDefinition
from .tool_manager import ToolManager, get_tool_manager
from .llm_manager import LLMManager, get_llm_manager
from .session_manager import SessionManager, get_session_manager


class WorkflowExecutor:
    """
    Executor for agent workflows.

    Handles:
    - Workflow step execution
    - Variable resolution and templating
    - Tool and LLM calls
    - Conditions, loops, and parallel execution
    - Error handling and recovery
    """

    def __init__(
        self,
        tool_manager: ToolManager = None,
        llm_manager: LLMManager = None,
        session_manager: SessionManager = None,
    ):
        self.tool_manager = tool_manager or get_tool_manager()
        self.llm_manager = llm_manager or get_llm_manager()
        self.session_manager = session_manager or get_session_manager()

    async def execute(
        self,
        agent: AgentDefinition,
        workflow: Dict[str, Any],
        inputs: Dict[str, Any],
        files: Dict[str, Any] = None,
        session: AgentSession = None,
    ) -> WorkflowExecutionContext:
        """
        Execute a workflow.

        Args:
            agent: Agent definition
            workflow: Workflow definition
            inputs: Input values from UI
            files: Uploaded files
            session: Conversation session (for chat agents)

        Returns:
            WorkflowExecutionContext with results
        """
        # Initialize context
        context = WorkflowExecutionContext(
            workflow_id=workflow.get("id", "unknown"),
            workflow_name=workflow.get("name", "Unknown Workflow"),
            agent_id=agent.id,
            status=ExecutionStatus.RUNNING,
            started_at=datetime.utcnow(),
        )

        # Initialize variables
        context.variables = {
            **workflow.get("initial_variables", {}),
            **inputs,
            "agent_name": agent.name,
            "system_prompt": agent.system_prompt,
        }

        # Add session context if available
        if session:
            context.variables["session_id"] = session.session_id
            context.variables["conversation_history"] = [
                {"role": m.role.value, "content": m.content}
                for m in session.get_context_messages(agent.business_logic.get("context_window_messages", 10))
            ]

        # Add files to context
        if files:
            context.variables["files"] = files

        try:
            # Get entry step
            steps = workflow.get("steps", [])
            entry_step_id = workflow.get("entry_step")

            if not steps:
                context.status = ExecutionStatus.COMPLETED
                context.completed_at = datetime.utcnow()
                return context

            # Find entry step
            if entry_step_id:
                current_step = self._find_step(steps, entry_step_id)
            else:
                current_step = steps[0] if steps else None

            # Execute steps
            while current_step:
                context.current_step_id = current_step.get("id") or current_step.get("name")

                # Execute step
                step_result = await self._execute_step(current_step, context, agent, files)
                context.step_results.append(step_result)

                if step_result.status == ExecutionStatus.FAILED:
                    # Check error handling
                    on_error = current_step.get("on_error", "stop")
                    if on_error == "stop":
                        context.status = ExecutionStatus.FAILED
                        context.error = step_result.error
                        break
                    elif on_error == "continue":
                        # Continue to next step
                        pass

                # Get next step
                next_step_id = self._get_next_step(current_step, step_result, context)
                if next_step_id:
                    current_step = self._find_step(steps, next_step_id)
                else:
                    current_step = None

            if context.status != ExecutionStatus.FAILED:
                context.status = ExecutionStatus.COMPLETED

        except Exception as e:
            context.status = ExecutionStatus.FAILED
            context.error = str(e)

        context.completed_at = datetime.utcnow()
        return context

    async def _execute_step(
        self,
        step: Dict[str, Any],
        context: WorkflowExecutionContext,
        agent: AgentDefinition,
        files: Dict[str, Any] = None,
    ) -> StepExecutionResult:
        """Execute a single workflow step."""
        start_time = datetime.utcnow()
        step_id = step.get("id") or step.get("name", "unknown")
        step_name = step.get("name", "Unknown Step")
        step_type = step.get("type", "unknown")

        result = StepExecutionResult(
            step_id=step_id,
            step_name=step_name,
            step_type=step_type,
            status=ExecutionStatus.RUNNING,
            started_at=start_time,
        )

        try:
            if step_type == "llm_call":
                output = await self._execute_llm_call(step, context, agent)
            elif step_type == "tool_call":
                output = await self._execute_tool_call(step, context, agent, files)
            elif step_type == "condition":
                output = self._evaluate_condition(step, context)
            elif step_type == "loop":
                output = await self._execute_loop(step, context, agent, files)
            elif step_type == "parallel":
                output = await self._execute_parallel(step, context, agent, files)
            elif step_type == "set_variable":
                output = self._execute_set_variable(step, context)
            elif step_type == "data_transform":
                output = self._execute_transform(step, context)
            elif step_type == "user_input":
                output = self._get_user_input(step, context)
            elif step_type == "validation":
                output = self._execute_validation(step, context)
            else:
                raise ValueError(f"Unknown step type: {step_type}")

            # Store output in variables
            output_var = step.get("output_variable")
            if output_var:
                context.variables[output_var] = output

            result.output = output
            result.status = ExecutionStatus.COMPLETED

        except Exception as e:
            result.status = ExecutionStatus.FAILED
            result.error = str(e)

        result.completed_at = datetime.utcnow()
        result.duration_ms = int((result.completed_at - start_time).total_seconds() * 1000)

        return result

    async def _execute_llm_call(
        self,
        step: Dict[str, Any],
        context: WorkflowExecutionContext,
        agent: AgentDefinition,
    ) -> str:
        """Execute an LLM call step."""
        # Build prompt
        prompt_template = step.get("prompt_template") or "{{user_message}}"
        prompt = self._render_template(prompt_template, context.variables)

        # Get system prompt
        system_prompt = step.get("system_prompt_override") or agent.system_prompt

        # Build messages
        messages = []

        # Add conversation history if available
        if "conversation_history" in context.variables:
            messages.extend(context.variables["conversation_history"])

        # Add current prompt
        messages.append({"role": "user", "content": prompt})

        # Get LLM settings (per-step override supported via connector_id or direct provider/model)
        connector_id = step.get("connector_id")
        if connector_id:
            # Resolve provider/model from connector definition
            connector = self._resolve_connector(agent, connector_id)
            provider = connector.get("provider", agent.llm_provider)
            model = step.get("model_override") or connector.get("model", agent.llm_model)
            temperature = step.get("temperature_override") or connector.get("default_temperature", agent.temperature)
            max_tokens = step.get("max_tokens_override") or connector.get("default_max_tokens", agent.max_tokens)
        else:
            provider = step.get("provider_override") or agent.llm_provider
            model = step.get("model_override") or agent.llm_model
            temperature = step.get("temperature_override") or agent.temperature
            max_tokens = step.get("max_tokens_override") or agent.max_tokens

        # Call LLM
        response = await self.llm_manager.chat(
            messages=messages,
            provider=provider,
            model=model,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        if not response.success:
            raise Exception(f"LLM call failed: {response.error}")

        # Track token usage from the LLM response
        if response.usage:
            context.add_usage(response.usage)

        return response.content

    async def _execute_tool_call(
        self,
        step: Dict[str, Any],
        context: WorkflowExecutionContext,
        agent: AgentDefinition,
        files: Dict[str, Any] = None,
    ) -> Any:
        """Execute a tool call step."""
        tool_config_id = step.get("tool_config_id")

        # Get tool config from agent
        tool_config = agent.get_tool_config(tool_config_id)
        if not tool_config:
            raise ValueError(f"Tool config not found: {tool_config_id}")

        tool_id = tool_config.get("tool_id")

        # Resolve parameters
        parameters = self.tool_manager.resolve_parameters(
            tool_config=tool_config,
            inputs=context.variables,
            variables=context.variables,
            previous_outputs={r.output_variable: r.output for r in context.step_results if hasattr(r, 'output_variable')},
        )

        # Execute tool
        response = await self.tool_manager.execute(
            tool_id=tool_id,
            parameters=parameters,
            files=files,
            context=context.variables,
        )

        if not response.success:
            # Check error handling
            on_error = tool_config.get("on_error", "continue")
            if on_error == "stop":
                raise Exception(f"Tool call failed: {response.error}")
            elif on_error == "fallback":
                return tool_config.get("fallback_value")
            else:
                return None

        return response.output

    def _evaluate_condition(
        self,
        step: Dict[str, Any],
        context: WorkflowExecutionContext,
    ) -> bool:
        """Evaluate a condition step."""
        condition = step.get("condition", {})
        variable = condition.get("variable", "")
        operator = condition.get("operator", "eq")
        value = condition.get("value")

        # Get variable value
        actual = self._get_variable_value(variable, context.variables)

        # Evaluate
        result = self._compare(actual, operator, value)

        # Handle AND conditions
        and_conditions = condition.get("and_conditions", [])
        for sub in and_conditions:
            if not self._evaluate_single_condition(sub, context.variables):
                return False

        # Handle OR conditions
        or_conditions = condition.get("or_conditions", [])
        if or_conditions:
            or_result = False
            for sub in or_conditions:
                if self._evaluate_single_condition(sub, context.variables):
                    or_result = True
                    break
            result = result and or_result

        return result

    def _evaluate_single_condition(
        self,
        condition: Dict[str, Any],
        variables: Dict[str, Any],
    ) -> bool:
        """Evaluate a single condition."""
        variable = condition.get("variable", "")
        operator = condition.get("operator", "eq")
        value = condition.get("value")
        actual = self._get_variable_value(variable, variables)
        return self._compare(actual, operator, value)

    def _compare(self, actual: Any, operator: str, expected: Any) -> bool:
        """Compare values using the given operator."""
        if operator in ["eq", "equals", "=="]:
            return actual == expected
        elif operator in ["ne", "not_equals", "!="]:
            return actual != expected
        elif operator in ["gt", ">"]:
            return actual > expected
        elif operator in ["lt", "<"]:
            return actual < expected
        elif operator in ["gte", ">="]:
            return actual >= expected
        elif operator in ["lte", "<="]:
            return actual <= expected
        elif operator == "contains":
            return expected in str(actual) if actual else False
        elif operator == "not_contains":
            return expected not in str(actual) if actual else True
        elif operator == "is_empty":
            return not actual
        elif operator == "is_not_empty":
            return bool(actual)
        elif operator == "matches":
            return bool(re.match(expected, str(actual))) if actual else False
        else:
            return False

    async def _execute_loop(
        self,
        step: Dict[str, Any],
        context: WorkflowExecutionContext,
        agent: AgentDefinition,
        files: Dict[str, Any] = None,
    ) -> List[Any]:
        """Execute a loop step."""
        loop_var = step.get("loop_variable", "")
        item_name = step.get("loop_item_name", "item")
        index_name = step.get("loop_index_name", "index")
        max_iterations = step.get("max_iterations", 1000)

        # Get collection to iterate
        collection = self._get_variable_value(loop_var, context.variables)
        if not collection or not isinstance(collection, (list, tuple)):
            return []

        results = []
        loop_body = step.get("loop_body", [])

        for i, item in enumerate(collection[:max_iterations]):
            # Set loop variables
            context.variables[item_name] = item
            context.variables[index_name] = i

            # Execute loop body
            for body_step in loop_body:
                step_result = await self._execute_step(body_step, context, agent, files)
                if step_result.status == ExecutionStatus.FAILED:
                    break
                if step_result.output is not None:
                    results.append(step_result.output)

        return results

    async def _execute_parallel(
        self,
        step: Dict[str, Any],
        context: WorkflowExecutionContext,
        agent: AgentDefinition,
        files: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """Execute parallel steps."""
        parallel_steps = step.get("parallel_steps", [])
        wait_for_all = step.get("wait_for_all", True)

        # Create tasks
        tasks = []
        for ps in parallel_steps:
            task = asyncio.create_task(self._execute_step(ps, context, agent, files))
            tasks.append((ps.get("id") or ps.get("name", "unknown"), task))

        results = {}

        if wait_for_all:
            # Wait for all tasks
            for step_id, task in tasks:
                result = await task
                results[step_id] = result.output
        else:
            # Wait for first to complete
            done, pending = await asyncio.wait(
                [t for _, t in tasks],
                return_when=asyncio.FIRST_COMPLETED
            )
            for task in done:
                result = task.result()
                results[result.step_id] = result.output
            # Cancel pending
            for task in pending:
                task.cancel()

        return results

    def _execute_set_variable(
        self,
        step: Dict[str, Any],
        context: WorkflowExecutionContext,
    ) -> Any:
        """Execute a set_variable step."""
        var_name = step.get("variable_name")
        var_value = step.get("variable_value")

        if var_name:
            # Render value if it's a string template
            if isinstance(var_value, str):
                var_value = self._render_template(var_value, context.variables)
            context.variables[var_name] = var_value

        return var_value

    def _execute_transform(
        self,
        step: Dict[str, Any],
        context: WorkflowExecutionContext,
    ) -> Any:
        """Execute a data transform step."""
        expression = step.get("transform_expression", "")

        # Simple transform expressions
        # TODO: Implement a safe expression evaluator

        return self._render_template(expression, context.variables)

    def _get_user_input(
        self,
        step: Dict[str, Any],
        context: WorkflowExecutionContext,
    ) -> Dict[str, Any]:
        """Get user input from components."""
        input_components = step.get("input_components", [])
        inputs = {}

        for comp in input_components:
            if comp in context.variables:
                inputs[comp] = context.variables[comp]

        return inputs

    def _execute_validation(
        self,
        step: Dict[str, Any],
        context: WorkflowExecutionContext,
    ) -> bool:
        """Execute a validation step."""
        # TODO: Implement validation logic
        return True

    def _resolve_connector(self, agent: AgentDefinition, connector_id: str) -> Dict[str, Any]:
        """Resolve a connector definition by ID from the agent's connectors config."""
        connectors_config = agent.connectors
        connectors_list = connectors_config.get("connectors", [])
        for connector in connectors_list:
            if connector.get("id") == connector_id:
                return connector
        return {}

    def _find_step(self, steps: List[Dict[str, Any]], step_id: str) -> Optional[Dict[str, Any]]:
        """Find a step by ID or name."""
        for step in steps:
            if step.get("id") == step_id or step.get("name") == step_id:
                return step
        return None

    def _get_next_step(
        self,
        current_step: Dict[str, Any],
        result: StepExecutionResult,
        context: WorkflowExecutionContext,
    ) -> Optional[str]:
        """Determine the next step to execute."""
        step_type = current_step.get("type")

        if step_type == "condition":
            # Condition step - use on_true/on_false
            if result.output:
                return current_step.get("on_true")
            else:
                return current_step.get("on_false")
        else:
            # Normal step - use next_step
            return current_step.get("next_step")

    def _get_variable_value(self, path: str, variables: Dict[str, Any]) -> Any:
        """Get a variable value using dot notation."""
        if not path:
            return None

        parts = path.split(".")
        current = variables

        for part in parts:
            if isinstance(current, dict):
                current = current.get(part)
            elif isinstance(current, list) and part.isdigit():
                idx = int(part)
                current = current[idx] if idx < len(current) else None
            else:
                return None

            if current is None:
                return None

        return current

    def _render_template(self, template: str, variables: Dict[str, Any]) -> str:
        """Render a template string with variables."""
        if not template:
            return ""

        result = template

        # Replace {{variable}} patterns
        pattern = r'\{\{([^}]+)\}\}'

        def replace(match):
            var_name = match.group(1).strip()
            value = self._get_variable_value(var_name, variables)
            if value is None:
                return ""
            if isinstance(value, (dict, list)):
                return json.dumps(value, indent=2)
            return str(value)

        result = re.sub(pattern, replace, result)

        # Handle {{#if}} blocks (simplified)
        if_pattern = r'\{\{#if\s+([^}]+)\}\}(.*?)\{\{/if\}\}'

        def replace_if(match):
            condition_var = match.group(1).strip()
            content = match.group(2)
            value = self._get_variable_value(condition_var, variables)
            if value:
                return content
            return ""

        result = re.sub(if_pattern, replace_if, result, flags=re.DOTALL)

        return result


# Singleton instance
_executor: Optional[WorkflowExecutor] = None


def get_workflow_executor() -> WorkflowExecutor:
    """Get the workflow executor singleton."""
    global _executor
    if _executor is None:
        _executor = WorkflowExecutor()
    return _executor
