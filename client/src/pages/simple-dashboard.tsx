export default function SimpleDashboard() {
  console.log('SimpleDashboard component rendering...');
  
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#007bff', marginBottom: '20px' }}>
        SmartBlueprint Pro by GorJess & Co.
      </h1>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: '#495057', marginBottom: '16px' }}>
          Smart Home Device Management Dashboard
        </h2>
        <p style={{ color: '#6c757d', marginBottom: '16px' }}>
          Your intelligent IoT platform is loading...
        </p>
        <div style={{ 
          backgroundColor: '#e9ecef', 
          padding: '16px', 
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          <h3 style={{ color: '#495057', marginBottom: '8px' }}>System Status</h3>
          <p style={{ color: '#28a745', margin: '0' }}>✓ Backend AI Systems: Active</p>
          <p style={{ color: '#28a745', margin: '0' }}>✓ ML Anomaly Detection: Ready</p>
          <p style={{ color: '#28a745', margin: '0' }}>✓ Cloud Sync Tunnel: Connected</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Refresh Application
        </button>
        <button 
          onClick={() => window.location.href = '/ai-insights'}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          View AI Insights
        </button>
      </div>
    </div>
  );
}