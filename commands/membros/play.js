const axios = require('axios');
const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    name: 'play',
    description: 'Baixa áudio do YouTube',
    usage: '<link ou nome>',
    cooldown: 10,
    async execute(client, message, args) {
        let sentMessage = null;

        try {
            console.log('🎵 Comando play recebido:', args.join(' '));

            // Validação de argumentos
            if (args.length === 0) {
                return message.reply(`❌ *Uso correto:*\n${global.prefixo}play <link ou nome>\n\n*Exemplos:*\n• ${global.prefixo}play https://youtu.be/dQw4w9WgXcQ\n• ${global.prefixo}play Never Gonna Give You Up`);
            }

            const query = args.join(' ');
            console.log('🔍 Query:', query);

            // Envia mensagem de "aguarde"
            sentMessage = await message.reply('⏳ *Processando...*');

            // Valida se é link do YouTube
            const isYouTubeLink = query.includes('youtube.com') || query.includes('youtu.be');

            let videoUrl = query;

            // 🆕 SE NÃO FOR LINK, BUSCA NO YOUTUBE
            if (!isYouTubeLink) {
                console.log('🔎 Buscando no YouTube:', query);
                await sentMessage.edit(`🔎 *Procurando:* ${query}`);

                try {
                    // Busca usando a API do YouTube Data v3
                    const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
                        params: {
                            part: 'snippet',
                            q: query,
                            type: 'video',
                            maxResults: 1,
                            key: 'AIzaSyDQ218NQSDV7aPidfA4ueXNBUZ7nZQyCRk' // ⚠️ SUBSTITUA PELA SUA CHAVE
                        },
                        timeout: 10000
                    });

                    if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
                        await sentMessage.edit('❌ *Música não encontrada!*\n\n🔍 Tente:\n• Usar palavras-chave diferentes\n• Enviar o link direto do YouTube');
                        return;
                    }

                    const video = searchResponse.data.items[0];
                    const videoId = video.id.videoId;
                    videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                    
                    console.log('✅ Vídeo encontrado:', video.snippet.title);
                    console.log('🔗 URL:', videoUrl);

                    await sentMessage.edit(`✅ *Encontrado:* ${video.snippet.title}\n\n⬇️ *Baixando...*`);

                } catch (searchError) {
                    console.error('❌ Erro na busca:', searchError.message);
                    await sentMessage.edit('❌ *Erro ao buscar no YouTube*\n\n💡 Tente enviar o link direto do vídeo.');
                    return;
                }
            }

            console.log('🎬 URL do vídeo:', videoUrl);

            // Atualiza status
            await sentMessage.edit('🔗 *Conectando à API...*');

            // Chama a API Alauda (localhost)
            console.log('📡 Chamando API Alauda...');
            const apiResponse = await axios.post('http://localhost:3003/api/youtube/download', {
                url: videoUrl,
                format: 'mp3',
                quality: '128'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': process.env.ALAUDA_API_KEY
                },
                timeout: 300000
            });

            console.log('✅ Resposta da API:', apiResponse.data);

            if (!apiResponse.data.success) {
                await sentMessage.edit('❌ Erro ao processar o vídeo.');
                return;
            }

            const videoData = apiResponse.data.data;
            const downloadUrl = videoData.download?.url;

            console.log('📥 URL de download:', downloadUrl);

            if (!downloadUrl) {
                await sentMessage.edit('❌ Link de download não disponível. Tente novamente.');
                return;
            }

            // Atualiza com informações
            await sentMessage.edit(
                `🎵 *${videoData.title}*\n\n` +
                `⬇️ *Baixando áudio...*`
            );

            // Cria pasta temporária
            const tempDir = path.join(__dirname, '..', '..', 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            // Baixa o arquivo
            const fileName = `${Date.now()}.mp3`;
            const filePath = path.join(tempDir, fileName);

            console.log('💾 Baixando arquivo para:', filePath);

            const fileResponse = await axios({
                method: 'GET',
                url: downloadUrl,
                responseType: 'stream',
                timeout: 120000
            });

            const writer = fs.createWriteStream(filePath);
            fileResponse.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            console.log('✅ Arquivo baixado com sucesso!');

            // Verifica tamanho
            const fileStats = fs.statSync(filePath);
            const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);

            console.log(`📦 Tamanho: ${fileSizeMB}MB`);

            // Limite WhatsApp: 16MB
            if (fileStats.size > 16 * 1024 * 1024) {
                fs.unlinkSync(filePath);
                await sentMessage.edit(
                    `❌ *Arquivo muito grande!*\n\n` +
                    `💾 ${fileSizeMB}MB (máx: 16MB)\n\n` +
                    `🔗 Baixe direto:\n${downloadUrl}`
                );
                return;
            }

            await sentMessage.edit(`📤 *Enviando...*\n💾 ${fileSizeMB}MB`);

            // Envia o áudio
            const media = MessageMedia.fromFilePath(filePath);
            await client.sendMessage(message.from, media, {
                sendAudioAsVoice: false
            });

            console.log('✅ Áudio enviado!');

            // Remove arquivo
            setTimeout(() => {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ Arquivo removido`);
                }
            }, 5000);

            await sentMessage.edit('✅ *Áudio enviado!* 🎵');

        } catch (error) {
            console.error('❌ ERRO DETALHADO:', error);
            console.error('Stack trace:', error.stack);

            let errorMsg = '❌ Erro ao processar música!';

            if (error.code === 'ECONNREFUSED') {
                errorMsg = '❌ API não está acessível (localhost:3003)';
                console.error('💡 Verifique se a API está rodando: pm2 list');
            } else if (error.response) {
                errorMsg = `❌ Erro da API: ${error.response.status}`;
                console.error('Resposta da API:', error.response.data);
            } else if (error.message) {
                errorMsg = `❌ Erro: ${error.message}`;
            }

            if (sentMessage) {
                await sentMessage.edit(`${errorMsg}\n\n⚠️ Erro interno.`);
            } else {
                await message.reply(`${errorMsg}\n\n⚠️ Erro interno.`);
            }
        }
    }
}
