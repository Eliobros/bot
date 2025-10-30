const axios = require('axios');
const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'spotify',
    aliases: ['sp', 'spot'],
    description: 'Baixa música do Spotify via SoundCloud',
    usage: '<nome da música>',
    cooldown: 10,
    async execute(client, message, args) {
        let sentMessage = null;
        let filePath = null;

        try {
            console.log('🎵 Comando spotify recebido:', args.join(' '));

            // Validação de argumentos
            if (args.length === 0) {
                return message.reply(
                    `❌ *Uso correto:*\n${global.prefixo}spotify <nome da música>\n\n` +
                    `*Exemplo:*\n` +
                    `• ${global.prefixo}spotify Photograph Ed Sheeran`
                );
            }

            const query = args.join(' ');
            console.log('🔍 Query:', query);

            // Envia mensagem de "aguarde"
            sentMessage = await message.reply('⏳ *Processando...*');

            // Variável para armazenar info da música
            let trackInfo = null;

            // 🔍 BUSCA NO SPOTIFY
            console.log('🔎 Buscando no Spotify:', query);
            await sentMessage.edit(`🔎 *Procurando:* ${query}`);

            try {
                // Busca usando a API Alauda
                const searchResponse = await axios.post('http://localhost:3003/api/spotify/search', {
                    query: query
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': 'alauda_live_75c9bb0856b8fbba792d875de9c26163eee504f8db3b5c29a8a8b9a9e046e665'
                    },
                    timeout: 15000
                });

                console.log('📡 Resposta da busca:', searchResponse.data);

                if (!searchResponse.data.success) {
                    await sentMessage.edit('❌ *Erro ao buscar música*');
                    return;
                }

                // Pega primeiro resultado das tracks
                const tracks = searchResponse.data.data?.tracks?.tracks?.items;
                
                if (!tracks || tracks.length === 0) {
                    await sentMessage.edit(
                        '❌ *Música não encontrada!*\n\n' +
                        '🔍 Tente:\n' +
                        '• Usar palavras-chave diferentes\n' +
                        '• Incluir nome do artista'
                    );
                    return;
                }

                const firstTrack = tracks[0];
                trackInfo = {
                    name: firstTrack.name,
                    artist: firstTrack.artists?.map(a => a.name).join(', ') || 'Desconhecido',
                    album: firstTrack.album?.name || 'Desconhecido',
                    id: firstTrack.id
                };

                console.log('✅ Música encontrada:', trackInfo.name);

                await sentMessage.edit(
                    `✅ *Encontrado:*\n` +
                    `🎵 ${trackInfo.name}\n` +
                    `👤 ${trackInfo.artist}\n` +
                    `💿 ${trackInfo.album}\n\n` +
                    `⬇️ *Processando...*`
                );

            } catch (searchError) {
                console.error('❌ Erro na busca:', searchError.message);
                
                if (searchError.response?.data?.message) {
                    await sentMessage.edit(`❌ ${searchError.response.data.message}`);
                } else {
                    await sentMessage.edit('❌ *Erro ao buscar no Spotify*');
                }
                return;
            }

            // 📥 BAIXA A MÚSICA VIA SOUNDCLOUD
            console.log('📡 Chamando API Alauda para download...');
            
            const downloadResponse = await axios.post('http://localhost:3003/api/spotify/download', {
                track: `${trackInfo.name} ${trackInfo.artist}`,
                quality: 'sq'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'alauda_live_75c9bb0856b8fbba792d875de9c26163eee504f8db3b5c29a8a8b9a9e046e665'
                },
                timeout: 60000
            });

            console.log('✅ Resposta do download recebida');

            if (!downloadResponse.data.success) {
                await sentMessage.edit('❌ Erro ao processar a música.');
                return;
            }

            const songData = downloadResponse.data;
            
            // Acessa data.soundcloudTrack.audio
            const audioFormats = songData.data?.soundcloudTrack?.audio;
            
            console.log('🔍 Formatos de áudio disponíveis:', audioFormats?.length);

            if (!audioFormats || audioFormats.length === 0) {
                console.error('❌ Nenhum formato de áudio disponível');
                await sentMessage.edit('❌ Link de download não disponível. Tente novamente.');
                return;
            }

            // Pega o primeiro formato MP3
            const mp3Format = audioFormats.find(a => a.format === 'mp3') || audioFormats[0];
            const downloadUrl = mp3Format?.url;

            console.log('📥 Formato selecionado:', mp3Format?.format);

            if (!downloadUrl) {
                console.error('❌ URL não encontrada no formato');
                await sentMessage.edit('❌ Link de download não disponível. Tente novamente.');
                return;
            }

            // ===== INFORMAÇÕES COMPLETAS DA MÚSICA =====
            const spotifyTrack = songData.data?.spotifyTrack || {};
            const soundcloudTrack = songData.data?.soundcloudTrack || {};

            // Formata a duração
            const durationMinutes = Math.floor(spotifyTrack.durationMs / 60000);
            const durationSeconds = Math.floor((spotifyTrack.durationMs % 60000) / 1000);
            const durationFormatted = `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`;

            // Formata data de lançamento (se disponível)
            let releaseInfo = '';
            if (spotifyTrack.album?.releaseDate) {
                try {
                    const releaseDate = new Date(spotifyTrack.album.releaseDate);
                    releaseInfo = `📅 *Lançamento:* ${releaseDate.toLocaleDateString('pt-BR')}\n`;
                } catch (e) {
                    console.log('⚠️ Erro ao formatar data');
                }
            }

            // Verifica se é explícito
            const explicitTag = spotifyTrack.explicit ? '🔞 *Conteúdo Explícito*\n' : '';

            // Monta mensagem completa com informações
            const infoMessage = 
                `🎵 *${spotifyTrack.name || trackInfo.name}*\n\n` +
                `👤 *Artista(s):* ${spotifyTrack.artists?.map(a => a.name).join(', ') || trackInfo.artist}\n` +
                `💿 *Álbum:* ${spotifyTrack.album?.name || trackInfo.album}\n` +
                releaseInfo +
                `⏱️ *Duração:* ${durationFormatted}\n` +
                explicitTag +
                `\n` +
                `🔗 *Links:*\n` +
                `• Spotify: ${spotifyTrack.shareUrl || 'N/A'}\n` +
                `• SoundCloud: ${soundcloudTrack.permalink || 'N/A'}\n\n` +
                `⬇️ *Preparando download...*`;

            await sentMessage.edit(infoMessage);

            // ===== ENVIA CAPA DA MÚSICA =====
            const coverUrl = spotifyTrack.album?.cover?.[2]?.url || spotifyTrack.album?.cover?.[1]?.url || spotifyTrack.album?.cover?.[0]?.url;

            if (coverUrl) {
                try {
                    console.log('🖼️ Enviando capa da música...');
                    
                    const coverMedia = await MessageMedia.fromUrl(coverUrl);
                    
                    await client.sendMessage(message.from, coverMedia, {
                        caption: 
                            `🎵 *${spotifyTrack.name}*\n` +
                            `👤 ${spotifyTrack.artists?.[0]?.name}\n` +
                            `💿 ${spotifyTrack.album?.name}\n` +
                            `⏱️ ${durationFormatted}`
                    });
                    
                    console.log('✅ Capa enviada!');
                } catch (coverError) {
                    console.error('⚠️ Erro ao enviar capa:', coverError.message);
                    // Continua mesmo se falhar o envio da capa
                }
            }

            // Atualiza mensagem para "baixando"
            await sentMessage.edit(
                `🎵 *${spotifyTrack.name}*\n` +
                `👤 ${spotifyTrack.artists?.[0]?.name}\n\n` +
                `📥 *Baixando áudio...*`
            );

            // ===== DOWNLOAD DO ÁUDIO =====
            // Cria pasta temporária
            const tempDir = path.join(__dirname, '..', '..', 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            // Baixa o arquivo
            const fileName = `${Date.now()}.mp3`;
            filePath = path.join(tempDir, fileName);

            console.log('💾 Baixando arquivo para:', filePath);

            const fileResponse = await axios({
                method: 'GET',
                url: downloadUrl,
                responseType: 'stream',
                timeout: 120000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Referer': 'https://soundcloud.com/',
                    'Origin': 'https://soundcloud.com'
                },
                maxRedirects: 5
            });

            const writer = fs.createWriteStream(filePath);
            fileResponse.data.pipe(writer);

            // Monitora progresso do download
            let downloadedBytes = 0;
            let lastUpdate = Date.now();

            fileResponse.data.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                
                // Atualiza a cada 3 segundos para não fazer spam
                if (Date.now() - lastUpdate > 3000) {
                    const downloadedMB = (downloadedBytes / 1024 / 1024).toFixed(2);
                    sentMessage.edit(
                        `🎵 *${spotifyTrack.name}*\n` +
                        `👤 ${spotifyTrack.artists?.[0]?.name}\n\n` +
                        `📥 *Baixando:* ${downloadedMB}MB...`
                    ).catch(() => {}); // Ignora erro se atualizar muito rápido
                    
                    lastUpdate = Date.now();
                }
            });

            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    writer.destroy();
                    reject(new Error('Timeout ao baixar arquivo'));
                }, 120000); // 2 minutos

                writer.on('finish', () => {
                    clearTimeout(timeout);
                    console.log('✅ Download finalizado');
                    resolve();
                });
                writer.on('error', (err) => {
                    clearTimeout(timeout);
                    console.error('❌ Erro no writer:', err);
                    reject(err);
                });
            });

            console.log('✅ Arquivo baixado com sucesso!');

            // Verifica tamanho
            const fileStats = fs.statSync(filePath);
            const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);

            console.log(`📦 Tamanho: ${fileSizeMB}MB`);

            // Verifica se arquivo é válido
            if (fileStats.size < 1000) { // Menos de 1KB
                fs.unlinkSync(filePath);
                await sentMessage.edit('❌ *Arquivo inválido ou corrompido*');
                return;
            }

            // Limite WhatsApp: 16MB
            if (fileStats.size > 16 * 1024 * 1024) {
                fs.unlinkSync(filePath);
                await sentMessage.edit(
                    `❌ *Arquivo muito grande!*\n\n` +
                    `💾 ${fileSizeMB}MB (máx: 16MB)\n\n` +
                    `🔗 Baixe direto:\n${spotifyTrack.shareUrl}`
                );
                return;
            }

            await sentMessage.edit(
                `🎵 *${spotifyTrack.name}*\n` +
                `👤 ${spotifyTrack.artists?.[0]?.name}\n\n` +
                `📤 *Enviando...*\n💾 ${fileSizeMB}MB`
            );

            // ===== ENVIA O ÁUDIO =====
            const media = MessageMedia.fromFilePath(filePath);
            await client.sendMessage(message.from, media, {
                sendAudioAsVoice: false,
                caption: `🎵 ${spotifyTrack.name}\n👤 ${spotifyTrack.artists?.[0]?.name}`
            });

            console.log('✅ Áudio enviado!');

            // Remove arquivo após 5 segundos
            setTimeout(() => {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ Arquivo removido`);
                }
            }, 5000);

            await sentMessage.edit(
                `✅ *Música enviada com sucesso!* 🎵\n\n` +
                `🎵 ${spotifyTrack.name}\n` +
                `👤 ${spotifyTrack.artists?.[0]?.name}\n` +
                `💾 ${fileSizeMB}MB`
            );

        } catch (error) {
            console.error('❌ ERRO DETALHADO:', error);
            console.error('Stack trace:', error.stack);

            // Limpar arquivo se existir
            if (filePath && fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    console.log('🗑️ Arquivo removido após erro');
                } catch (cleanupError) {
                    console.error('❌ Erro ao limpar arquivo:', cleanupError);
                }
            }

            let errorMsg = '❌ Erro ao processar música!';

            if (error.code === 'ECONNREFUSED') {
                errorMsg = '❌ API não está acessível (localhost:3003)';
                console.error('💡 Verifique se a API está rodando: pm2 list');
            } else if (error.response) {
                errorMsg = `❌ Erro da API: ${error.response.status}`;
                console.error('Resposta da API:', error.response.data);
                
                if (error.response.data?.message) {
                    errorMsg = `❌ ${error.response.data.message}`;
                }
            } else if (error.message) {
                errorMsg = `❌ Erro: ${error.message}`;
            }

            if (sentMessage) {
                await sentMessage.edit(`${errorMsg}\n\n⚠️ Tente novamente em alguns instantes.`);
            } else {
                await message.reply(`${errorMsg}\n\n⚠️ Tente novamente em alguns instantes.`);
            }
        }
    }
}
