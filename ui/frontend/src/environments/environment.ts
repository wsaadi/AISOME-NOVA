export const environment = {
  production: false,
  api: {
    wordCrud: 'http://localhost:8001',
    webSearch: 'http://localhost:8002',
    pdfCrud: 'http://localhost:8003',
    excelCrud: 'http://localhost:8004',
    mistralConnector: 'http://localhost:8005',
    fileUpload: 'http://localhost:8007',
    documentExtractor: 'http://localhost:8008',
    documentAnalyzer: 'http://localhost:8008',  // Uses document-extractor for now
    appointmentScheduler: 'http://localhost:8010',
    pptxCrud: 'http://localhost:8011',
    aiChat: '',  // Utilise le proxy Angular configuré dans proxy.conf.json
    webMonitoring: 'http://localhost:8017',
    contractAnalysis: 'http://localhost:8018',
    podAnalyzer: 'http://localhost:8025',  // Uses agent-runtime
    emlParser: 'http://localhost:8020',
    nvidiaMultimodal: 'http://localhost:8030',
    nvidiaVista3d: 'http://localhost:8031',
    nvidiaFourcastnet: 'http://localhost:8033',
    nvidiaOpenfold3: 'http://localhost:8034',
    nvidiaGroundingDino: 'http://localhost:8035'
  },
  apiUrl: 'http://localhost:8025',  // Agent Runtime for settings
  agentBuilderUrl: '',  // Uses Angular proxy in dev, nginx in prod
  agentRuntimeUrl: 'http://localhost:8025'
};
