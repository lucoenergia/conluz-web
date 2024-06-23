    import https from 'https';
    import axios from 'axios';

    const agent = new https.Agent({
      rejectUnauthorized: false
    });

    const apiClient = axios.create({
        baseURL: 'http://localhost:8443/api/v1',
        //httpsAgent: agent,
        headers: {
            'Content-Type': 'application/json'
        }
    });

    export default apiClient;
