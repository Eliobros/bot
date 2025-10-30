module.exports = {
    name: 'ban',
    description: 'Bane um usuário do grupo.',
    execute: async (client, message, args) => {
        try {
            // Verifica se o comando foi usado em grupo
            if (!message.from.endsWith('@g.us')) {
                return message.reply('❌ Este comando só pode ser usado em grupos.');
            }

            const chat = await message.getChat();
            
            // Verifica se o bot é admin
            const botNumber = client.info.wid._serialized;
            const botParticipant = chat.participants.find(p => p.id._serialized === botNumber);
            
            if (!botParticipant?.isAdmin && !botParticipant?.isSuperAdmin) {
                return message.reply('❌ Eu preciso ser administrador para banir usuários.');
            }

            // Verifica se o usuário que enviou o comando é admin
            const sender = message.author || message.from;
            const senderParticipant = chat.participants.find(p => p.id._serialized === sender);
            
            if (!senderParticipant?.isAdmin && !senderParticipant?.isSuperAdmin) {
                return message.reply('❌ Apenas administradores podem usar este comando.');
            }

            // Determina quem será banido (prioridade: reply > menção > número)
            let userId;
            let userName;
            
            // 1. Verifica se é resposta a uma mensagem
            if (message.hasQuotedMsg) {
                const quotedMsg = await message.getQuotedMessage();
                userId = quotedMsg.author || quotedMsg.from;
                console.log('🎯 Banindo por reply:', userId);
            }
            // 2. Verifica se mencionou alguém
            else if (message.mentionedIds && message.mentionedIds.length > 0) {
                userId = message.mentionedIds[0];
                console.log('🎯 Banindo por menção:', userId);
            }
            // 3. Verifica se digitou número
            else if (args[0]) {
                const number = args[0].replace(/\D/g, '');
                if (number.length < 10) {
                    return message.reply('❌ Número inválido.\n\n*Formas de usar:*\n• !ban (respondendo mensagem)\n• !ban @usuario\n• !ban 5511999999999');
                }
                userId = `${number}@c.us`;
                console.log('🎯 Banindo por número:', userId);
            }
            // 4. Nenhuma forma válida
            else {
                return message.reply('❌ Como usar o comando:\n\n*1.* Responda a mensagem da pessoa com !ban\n*2.* Mencione: !ban @usuario\n*3.* Digite o número: !ban 5511999999999');
            }

            // Verifica se o usuário está no grupo
            const target = chat.participants.find(p => p.id._serialized === userId);
            if (!target) {
                return message.reply('❌ Usuário não encontrado no grupo.');
            }

            // Impede banir admins
            if (target.isAdmin || target.isSuperAdmin) {
                return message.reply('❌ Não posso banir administradores do grupo.');
            }

            // Impede banir o dono do bot
            const donoNumbers = global.donoConfig.NumeroDono;
            const targetNumber = userId.split('@')[0];
            if (donoNumbers.includes(targetNumber)) {
                return message.reply('❌ Não posso banir o dono do bot.');
            }

            // Impede o usuário banir a si mesmo
            if (userId === sender) {
                return message.reply('❌ Você não pode banir a si mesmo! 😅');
            }

            // Pega o nome do usuário
            try {
                const targetContact = await client.getContactById(userId);
                userName = targetContact.pushname || targetContact.number || targetNumber;
            } catch (err) {
                userName = targetNumber;
            }

            // Remove o usuário
            await chat.removeParticipants([userId]);
            
            message.reply(`✅ Usuário *${userName}* foi banido com sucesso! 🔨`);

        } catch (error) {
            console.error('❌ Erro no comando ban:', error);
            message.reply('❌ Ocorreu um erro ao tentar banir o usuário. Verifique se sou administrador.');
        }
    }
}
