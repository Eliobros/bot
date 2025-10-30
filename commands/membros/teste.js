const axios = require('axios');

const RAPIDAPI_KEY = '581eef45eemsh242fbe5e00e1e11p187affjsne6cd8fd6a1d2';
const RAPIDAPI_HOST = 'spotify-downloader9.p.rapidapi.com';

async function test() {
    try {
        const res = await axios.get('https://spotify-downloader9.p.rapidapi.com/search', {
            params: { q: 'Set fire in the rain', type: 'multi', limit: 1 },
            headers: {
                'x-rapidapi-host': RAPIDAPI_HOST,
                'x-rapidapi-key': RAPIDAPI_KEY
            }
        });
        console.log('✅ Resposta da API:', res.data);
    } catch (err) {
        if (err.response) {
            console.log('❌ Status:', err.response.status);
            console.log('❌ Mensagem:', err.response.data);
        } else {
            console.log('❌ Erro:', err.message);
        }
    }
}

test();
