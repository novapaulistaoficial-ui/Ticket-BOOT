const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  AttachmentBuilder,
  MessageFlags
} = require('discord.js');

const config = require('./config.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ========= CONFIGURAÇÃO VISUAL =========
const THUMBNAIL_URL = 'https://cdn.discordapp.com/attachments/825042115276439672/1486597991702728774/nova_paulistado_logo.png?ex=69c615c4&is=69c4c444&hm=cc9ee2898194645a0905b470873a4d74baa04fa809e885c35e8d5bbabb4e54cf&';
const BANNER_URL = 'https://cdn.discordapp.com/attachments/825042115276439672/1486597991002538074/ticketbanner.png?ex=69c615c4&is=69c4c444&hm=c69495ee3e73311c239dcc41a81e734381ed94bb5c6bae08e856d9b861c52340&';
// =======================================

const wlSessions = new Map();
const wlApplications = new Map();

const WL_TIMEOUT_MS = 2 * 60 * 1000;

const wlQuestions = [
  {
    key: 'identificacao',
    title: '1. Informe exatamente neste formato',
    text: 'Nome: Seu Nome\nID: 123\nIdade: 20',
    validator: validateQuestion1
  },
  {
    key: 'rdm',
    title: '2. O que é RDM?',
    text: 'Explique com suas palavras e dê um exemplo.',
    validator: validateMinLength(15)
  },
  {
    key: 'vdm',
    title: '3. O que é VDM?',
    text: 'Explique com suas palavras e dê um exemplo.',
    validator: validateMinLength(15)
  },
  {
    key: 'metagaming',
    title: '4. O que é MetaGaming?',
    text: 'Explique com suas palavras e dê um exemplo.',
    validator: validateMinLength(15)
  },
  {
    key: 'powergaming',
    title: '5. O que é PowerGaming?',
    text: 'Explique com suas palavras e dê um exemplo.',
    validator: validateMinLength(15)
  },
  {
    key: 'areas_safe',
    title: '6. O que são áreas safe da cidade?',
    text: 'Cite quais são as áreas safe e explique o que não pode acontecer nelas.',
    validator: validateMinLength(20)
  },
  {
    key: 'abordagem_policial',
    title: '7. Em uma abordagem policial',
    text: 'Como você deve agir para manter um roleplay coerente e respeitoso?',
    validator: validateMinLength(20)
  },
  {
    key: 'confronto_reacao',
    title: '8. Situações de confronto ou reação',
    text: 'Em quais situações você entende que um confronto ou reação pode acontecer dentro do RP?',
    validator: validateMinLength(20)
  },
  {
    key: 'expectativas',
    title: '9. O que você espera da cidade?',
    text: 'Explique como pretende contribuir para um bom roleplay.',
    validator: validateMinLength(20)
  },
  {
    key: 'historia_personagem',
    title: '10. Monte a história do seu personagem',
    text: 'Escreva a história do seu personagem com no mínimo 300 caracteres.\nFale quem ele é, de onde veio, como chegou na cidade, seu objetivo, personalidade e o que pretende construir no RP.',
    validator: validateMinLength(300)
  }
];

function validateMinLength(min) {
  return (content) => {
    if (!content || content.trim().length < min) {
      return `❌ Sua resposta precisa ter pelo menos ${min} caracteres. Responda novamente.`;
    }
    return null;
  };
}

function validateQuestion1(content) {
  const nomeMatch = content.match(/nome\s*:\s*(.+)/i);
  const idMatch = content.match(/\bid\s*:\s*(\d+)/i);
  const idadeMatch = content.match(/idade\s*:\s*(\d+)/i);

  if (!nomeMatch || !idMatch || !idadeMatch) {
    return '❌ Responda exatamente no formato:\nNome: Seu Nome\nID: 123\nIdade: 20';
  }

  return null;
}

function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-_]/g, '');
}

function obterNomeBaseCategoria(categoria) {
  const mapa = {
    suporte: 'suporte',
    denuncias: 'denuncia',
    doacoes: 'doacao',
    streamer: 'streamer'
  };

  return mapa[categoria] || 'ticket';
}

function obterMensagemCategoria(categoria, usuario) {
  if (categoria === 'suporte') {
    return {
      titulo: '🛠️ Ticket de Suporte',
      descricao: [
        `Olá ${usuario}, seu ticket de **suporte** foi aberto com sucesso.`,
        '',
        'Envie o máximo de informações possíveis para agilizar seu atendimento.',
        '',
        '**Informe de preferência:**',
        '- O que aconteceu',
        '- Quando aconteceu',
        '- Se apareceu algum erro',
        '- Print ou vídeo, se tiver'
      ].join('\n')
    };
  }

  if (categoria === 'denuncias') {
    return {
      titulo: '🚨 Ticket de Denúncia',
      descricao: [
        `Olá ${usuario}, seu ticket de **denúncia** foi aberto com sucesso.`,
        '',
        'Para que a equipe possa analisar corretamente, envie as informações abaixo:',
        '',
        '**Obrigatório:**',
        '- Nome ou ID do jogador denunciado',
        '- O que aconteceu',
        '- Data e horário aproximado',
        '- Provas (print, vídeo ou clipe)',
        '',
        '⚠️ **Denúncias sem provas podem ser recusadas.**'
      ].join('\n')
    };
  }

  if (categoria === 'doacoes') {
    return {
      titulo: '💎 Ticket de Doações',
      descricao: [
        `Olá ${usuario}, seu ticket de **doações** foi aberto com sucesso.`,
        '',
        'Envie as informações abaixo para agilizar a verificação:',
        '',
        '- O que foi comprado',
        '- Comprovante de pagamento, se tiver',
        '- Seu ID no servidor',
        '- Detalhe da dúvida ou problema'
      ].join('\n')
    };
  }

  if (categoria === 'streamer') {
    return {
      titulo: '🎥 Ticket de Streamer',
      descricao: [
        `Olá ${usuario}, seu ticket de **Seja Streamer** foi aberto com sucesso.`,
        '',
        'Para análise da equipe, envie as informações abaixo:',
        '',
        '- Link da live ou canal',
        '- Plataforma (Twitch, Kick, YouTube...)',
        '- Média de viewers',
        '',
        'Após a análise, nossa equipe retornará por aqui.'
      ].join('\n')
    };
  }

  return {
    titulo: '🎫 Ticket aberto',
    descricao: `Olá ${usuario}, seu ticket foi aberto com sucesso.`
  };
}

function criarBotoesTicket() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('assumir_ticket')
      .setLabel('Assumir Ticket')
      .setEmoji('👤')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('fechar_ticket')
      .setLabel('Fechar Ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger)
  );
}

function staffPodeAtuar(member) {
  return member.roles.cache.has(config.staffRoleId);
}

function criarMetaTicket(ownerId, categoria, assumedBy = null) {
  return JSON.stringify({
    tipo: 'ticket',
    ownerId,
    categoria,
    assumedBy
  });
}

function lerMeta(topic) {
  try {
    if (!topic) return null;
    return JSON.parse(topic);
  } catch {
    return null;
  }
}

async function buscarTodasMensagens(channel) {
  let todas = [];
  let ultimaId = null;

  while (true) {
    const options = { limit: 100 };
    if (ultimaId) options.before = ultimaId;

    const mensagens = await channel.messages.fetch(options);
    if (!mensagens.size) break;

    todas = todas.concat(Array.from(mensagens.values()));
    ultimaId = mensagens.last().id;

    if (mensagens.size < 100) break;
  }

  return todas.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function montarTranscriptTexto(channel, mensagens) {
  const linhas = [];

  linhas.push(`Ticket: #${channel.name}`);
  linhas.push(`Servidor: ${channel.guild.name}`);
  linhas.push(`Canal ID: ${channel.id}`);
  linhas.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
  linhas.push('='.repeat(80));
  linhas.push('');

  for (const msg of mensagens) {
    const data = new Date(msg.createdTimestamp).toLocaleString('pt-BR');
    const autor = `${msg.author?.tag || 'Usuário desconhecido'} (${msg.author?.id || 'sem-id'})`;
    const conteudo =
      msg.content && msg.content.trim().length > 0 ? msg.content : '[sem texto]';

    linhas.push(`[${data}] ${autor}`);
    linhas.push(conteudo);

    if (msg.attachments?.size) {
      linhas.push('Anexos:');
      for (const anexo of msg.attachments.values()) {
        linhas.push(`- ${anexo.url}`);
      }
    }

    if (msg.embeds?.length) {
      linhas.push(`Embeds: ${msg.embeds.length}`);
      for (const embed of msg.embeds) {
        if (embed.title) linhas.push(`  Título: ${embed.title}`);
        if (embed.description) linhas.push(`  Descrição: ${embed.description}`);
      }
    }

    linhas.push('-'.repeat(80));
  }

  return linhas.join('\n');
}

function parseQuestion1(content) {
  const nomeMatch = content.match(/nome\s*:\s*(.+)/i);
  const idMatch = content.match(/\bid\s*:\s*(\d+)/i);
  const idadeMatch = content.match(/idade\s*:\s*(\d+)/i);

  if (!nomeMatch || !idMatch || !idadeMatch) return null;

  return {
    nome: nomeMatch[1].trim().replace(/\s+/g, ' '),
    id: idMatch[1].trim(),
    idade: idadeMatch[1].trim()
  };
}

function sanitizarApelido(nome, id) {
  let apelido = `${nome} | ${id}`.trim();
  if (apelido.length > 32) apelido = apelido.slice(0, 32);
  return apelido;
}

function formatWlSummary(application) {
  const q = application.answers;

  return [
    `**Usuário:** <@${application.userId}>`,
    `**Discord ID:** \`${application.userId}\``,
    `**Nome informado:** ${application.profile?.nome || 'Não informado'}`,
    `**ID informado:** ${application.profile?.id || 'Não informado'}`,
    `**Idade informada:** ${application.profile?.idade || 'Não informada'}`,
    '',
    `**1. Identificação**`,
    q.identificacao || 'Não respondeu',
    '',
    `**2. RDM**`,
    q.rdm || 'Não respondeu',
    '',
    `**3. VDM**`,
    q.vdm || 'Não respondeu',
    '',
    `**4. MetaGaming**`,
    q.metagaming || 'Não respondeu',
    '',
    `**5. PowerGaming**`,
    q.powergaming || 'Não respondeu',
    '',
    `**6. Áreas safe**`,
    q.areas_safe || 'Não respondeu',
    '',
    `**7. Abordagem policial**`,
    q.abordagem_policial || 'Não respondeu',
    '',
    `**8. Confronto / reação**`,
    q.confronto_reacao || 'Não respondeu',
    '',
    `**9. Expectativas**`,
    q.expectativas || 'Não respondeu',
    '',
    `**10. História do personagem**`,
    q.historia_personagem || 'Não respondeu'
  ].join('\n');
}

function createWlSession(channel, userId) {
  const session = {
    channelId: channel.id,
    userId,
    currentQuestionIndex: 0,
    answers: {},
    timeout: null
  };

  wlSessions.set(channel.id, session);
  return session;
}

function clearWlTimeout(session) {
  if (session?.timeout) {
    clearTimeout(session.timeout);
    session.timeout = null;
  }
}

function removeWlSession(channelId) {
  const session = wlSessions.get(channelId);
  if (session) clearWlTimeout(session);
  wlSessions.delete(channelId);
}

async function askCurrentWlQuestion(channel) {
  const session = wlSessions.get(channel.id);
  if (!session) return;

  clearWlTimeout(session);

  const question = wlQuestions[session.currentQuestionIndex];
  if (!question) return;

  const embed = new EmbedBuilder()
    .setColor('#111318')
    .setTitle(`📋 Whitelist • Pergunta ${session.currentQuestionIndex + 1}/${wlQuestions.length}`)
    .setDescription(
      [
        `**${question.title}**`,
        '',
        question.text,
        '',
        `⏳ Você tem **2 minutos** para responder esta pergunta.`
      ].join('\n')
    )
    .setFooter({ text: 'Nova Paulistana Roleplay • Whitelist' });

  if (THUMBNAIL_URL && THUMBNAIL_URL.startsWith('http')) {
    embed.setThumbnail(THUMBNAIL_URL);
  }

  await channel.send({ embeds: [embed] });

  session.timeout = setTimeout(async () => {
    try {
      await channel.send('⏰ Tempo esgotado. Sua whitelist foi encerrada. Você precisará começar novamente.');
      removeWlSession(channel.id);
      setTimeout(async () => {
        try {
          await channel.delete();
        } catch {}
      }, 5000);
    } catch {}
  }, WL_TIMEOUT_MS);
}

async function finalizarWl(channel) {
  const session = wlSessions.get(channel.id);
  if (!session) return;

  clearWlTimeout(session);

  const profile = parseQuestion1(session.answers.identificacao);

  const application = {
    userId: session.userId,
    channelId: channel.id,
    answers: session.answers,
    profile,
    createdAt: Date.now(),
    reviewMessageId: null
  };

  const reviewChannel = await channel.guild.channels.fetch(config.wlReviewChannelId).catch(() => null);

  if (!reviewChannel || !reviewChannel.isTextBased() || reviewChannel.type !== ChannelType.GuildText) {
    await channel.send('❌ Não encontrei o canal de análise da WL. Avise a equipe.');
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#111318')
    .setTitle('📋 Nova Whitelist para análise')
    .setDescription(formatWlSummary(application))
    .setFooter({
      text: `Use /aprovar usuario:${session.userId} ou /reprovar usuario:${session.userId}`
    })
    .setTimestamp();

  const reviewMessage = await reviewChannel.send({
    content: `<@&${config.staffRoleId}> nova whitelist enviada para análise.`,
    embeds: [embed]
  });

  application.reviewMessageId = reviewMessage.id;
  wlApplications.set(session.userId, application);

  await channel.send('✅ Sua whitelist foi enviada para análise da equipe. Aguarde o retorno no seu privado.');

  removeWlSession(channel.id);

  setTimeout(async () => {
    try {
      await channel.delete();
    } catch {}
  }, 7000);
}

client.once('ready', () => {
  console.log(`🔥 Bot online como ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'painel') {
      const embed = new EmbedBuilder()
        .setColor('#111318')
        .setTitle('📩 ATENDIMENTO NOVA PAULISTANA')
        .setDescription(
          [
            'Seja bem-vindo ao sistema de atendimento da **Nova Paulistana Roleplay**.',
            'Use o menu abaixo para abrir um ticket e aguarde o atendimento da equipe.',
            '',
            '> **Avisos importantes**',
            '> Não abra ticket sem necessidade.',
            '> Evite marcar a equipe excessivamente.',
            '> Agilize o atendimento enviando o máximo de informações possíveis.'
          ].join('\n')
        )
        .setFooter({ text: 'Nova Paulistana Roleplay • Sistema de Atendimento' });

      if (THUMBNAIL_URL && THUMBNAIL_URL.startsWith('http')) embed.setThumbnail(THUMBNAIL_URL);
      if (BANNER_URL && BANNER_URL.startsWith('http')) embed.setImage(BANNER_URL);

      const menu = new StringSelectMenuBuilder()
        .setCustomId('ticket_select')
        .setPlaceholder('Selecione a categoria de atendimento')
        .addOptions([
          { label: 'Suporte', description: 'Dúvidas, bugs e ajuda geral', value: 'suporte', emoji: '🛠️' },
          { label: 'Denúncias', description: 'Envie denúncias com provas', value: 'denuncias', emoji: '🚨' },
          { label: 'Doações', description: 'Dúvidas sobre compras e doações', value: 'doacoes', emoji: '💎' },
          { label: 'Seja Streamer', description: 'Solicite parceria com a cidade', value: 'streamer', emoji: '🎥' }
        ]);

      const row = new ActionRowBuilder().addComponents(menu);
      const panelChannel = await interaction.guild.channels.fetch(config.panelChannelId);

      if (!panelChannel || !panelChannel.isTextBased() || panelChannel.type !== ChannelType.GuildText) {
        return await interaction.reply({
          content: '❌ O canal do painel de ticket precisa ser um canal de texto normal.',
          flags: MessageFlags.Ephemeral
        });
      }

      await panelChannel.send({ embeds: [embed], components: [row] });

      await interaction.reply({
        content: `✅ Painel enviado com sucesso em ${panelChannel}.`,
        flags: MessageFlags.Ephemeral
      });

      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'painelwl') {
      const embed = new EmbedBuilder()
        .setColor('#111318')
        .setTitle('📋 WHITELIST NOVA PAULISTANA')
        .setDescription(
          [
            'Seja bem-vindo ao sistema de **Whitelist** da **Nova Paulistana Roleplay**.',
            '',
            'Apenas cidadãos com o cargo **Turista** podem iniciar a WL.',
            'A WL será feita **pergunta por pergunta**.',
            'Cada pergunta tem **2 minutos** para ser respondida.',
            '',
            'Se o tempo acabar, você terá que começar tudo de novo.'
          ].join('\n')
        )
        .setFooter({ text: 'Nova Paulistana Roleplay • Whitelist' });

      if (THUMBNAIL_URL && THUMBNAIL_URL.startsWith('http')) embed.setThumbnail(THUMBNAIL_URL);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('abrir_wl')
          .setLabel('Fazer Whitelist')
          .setEmoji('📋')
          .setStyle(ButtonStyle.Primary)
      );

      const wlPanelChannel = await interaction.guild.channels.fetch(config.wlPanelChannelId);

      if (!wlPanelChannel || !wlPanelChannel.isTextBased() || wlPanelChannel.type !== ChannelType.GuildText) {
        return await interaction.reply({
          content: '❌ O canal do painel da WL precisa ser um canal de texto normal.',
          flags: MessageFlags.Ephemeral
        });
      }

      await wlPanelChannel.send({ embeds: [embed], components: [row] });

      await interaction.reply({
        content: `✅ Painel da WL enviado com sucesso em ${wlPanelChannel}.`,
        flags: MessageFlags.Ephemeral
      });

      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'aprovar') {
      if (!staffPodeAtuar(interaction.member)) {
        return await interaction.reply({
          content: '❌ Apenas a equipe pode aprovar WL.',
          flags: MessageFlags.Ephemeral
        });
      }

      const usuario = interaction.options.getUser('usuario', true);
      const application = wlApplications.get(usuario.id);

      if (!application) {
        return await interaction.reply({
          content: '❌ Não encontrei uma whitelist pendente para esse usuário.',
          flags: MessageFlags.Ephemeral
        });
      }

      const member = await interaction.guild.members.fetch(usuario.id).catch(() => null);

      if (!member) {
        return await interaction.reply({
          content: '❌ Não encontrei esse usuário no servidor.',
          flags: MessageFlags.Ephemeral
        });
      }

      if (!application.profile?.nome || !application.profile?.id) {
        return await interaction.reply({
          content: '❌ Não encontrei Nome e ID válidos da pergunta 1.',
          flags: MessageFlags.Ephemeral
        });
      }

      const apelidoNovo = sanitizarApelido(application.profile.nome, application.profile.id);

      let removeTuristaOk = false;
      let addMoradorOk = false;
      let nicknameOk = false;

      try {
        if (member.roles.cache.has(config.turistaRoleId)) {
          await member.roles.remove(config.turistaRoleId);
        }
        removeTuristaOk = true;
      } catch (e) {
        console.error('Erro ao remover Turista:', e);
      }

      try {
        if (!member.roles.cache.has(config.moradorRoleId)) {
          await member.roles.add(config.moradorRoleId);
        }
        addMoradorOk = true;
      } catch (e) {
        console.error('Erro ao adicionar Morador:', e);
      }

      try {
        await member.setNickname(apelidoNovo);
        nicknameOk = true;
      } catch (e) {
        console.error('Erro ao alterar nickname:', e);
      }

      try {
        const embedDM = new EmbedBuilder()
          .setColor('#2b8a3e')
          .setTitle('✅ Whitelist aprovada')
          .setDescription(
            [
              `Olá ${member.user}, sua **Whitelist foi aprovada** na **Nova Paulistana Roleplay**.`,
              '',
              'Parabéns! Agora você já faz parte da cidade como **Morador**.',
              'Desejamos uma ótima experiência e um excelente roleplay.'
            ].join('\n')
          )
          .setFooter({ text: 'Nova Paulistana Roleplay • Whitelist' });

        await member.send({ embeds: [embedDM] });
      } catch (e) {
        console.error('Erro ao enviar DM de aprovação:', e);
      }

      try {
        const reviewChannel = await interaction.guild.channels.fetch(config.wlReviewChannelId).catch(() => null);

        if (reviewChannel && application.reviewMessageId) {
          const msg = await reviewChannel.messages.fetch(application.reviewMessageId).catch(() => null);
          if (msg) await msg.delete().catch(() => null);
        }
      } catch (e) {
        console.error('Erro ao apagar mensagem de análise da WL aprovada:', e);
      }

      wlApplications.delete(usuario.id);

      await interaction.reply({
        content: [
          `✅ WL aprovada para ${member}.`,
          `• Turista removido: ${removeTuristaOk ? 'sim' : 'não'}`,
          `• Morador adicionado: ${addMoradorOk ? 'sim' : 'não'}`,
          `• Nick alterado para **${apelidoNovo}**: ${nicknameOk ? 'sim' : 'não'}`
        ].join('\n'),
        flags: MessageFlags.Ephemeral
      });

      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'reprovar') {
      if (!staffPodeAtuar(interaction.member)) {
        return await interaction.reply({
          content: '❌ Apenas a equipe pode reprovar WL.',
          flags: MessageFlags.Ephemeral
        });
      }

      const usuario = interaction.options.getUser('usuario', true);
      const application = wlApplications.get(usuario.id);

      if (!application) {
        return await interaction.reply({
          content: '❌ Não encontrei uma whitelist pendente para esse usuário.',
          flags: MessageFlags.Ephemeral
        });
      }

      try {
        const embedDM = new EmbedBuilder()
          .setColor('#c92a2a')
          .setTitle('❌ Whitelist reprovada')
          .setDescription(
            [
              `Olá ${usuario}, sua **Whitelist não foi aprovada** desta vez.`,
              '',
              'Revise suas respostas e faça novamente com atenção.',
              'Você poderá refazer a WL do zero.'
            ].join('\n')
          )
          .setFooter({ text: 'Nova Paulistana Roleplay • Whitelist' });

        await usuario.send({ embeds: [embedDM] });
      } catch (e) {
        console.error('Erro ao enviar DM de reprovação:', e);
      }

      try {
        const reviewChannel = await interaction.guild.channels.fetch(config.wlReviewChannelId).catch(() => null);

        if (reviewChannel && application.reviewMessageId) {
          const msg = await reviewChannel.messages.fetch(application.reviewMessageId).catch(() => null);
          if (msg) await msg.delete().catch(() => null);
        }
      } catch (e) {
        console.error('Erro ao apagar mensagem de análise da WL reprovada:', e);
      }

      wlApplications.delete(usuario.id);

      await interaction.reply({
        content: `❌ WL reprovada para ${usuario}. O usuário poderá refazer do zero.`,
        flags: MessageFlags.Ephemeral
      });

      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId !== 'ticket_select') return;

      const categoria = interaction.values[0];
      const nomeBase = obterNomeBaseCategoria(categoria);
      const nomeUsuario = normalizarTexto(interaction.user.username);
      const nomeCanal = `ticket-${nomeBase}-${nomeUsuario}`.slice(0, 95);

      const canalExistente = interaction.guild.channels.cache.find((canal) => {
        if (canal.parentId !== config.ticketCategoryId) return false;
        const meta = lerMeta(canal.topic);
        if (!meta || meta.tipo !== 'ticket') return false;
        return meta.ownerId === interaction.user.id;
      });

      if (canalExistente) {
        return await interaction.reply({
          content: `❌ Você já possui um ticket aberto: ${canalExistente}`,
          flags: MessageFlags.Ephemeral
        });
      }

      const novoCanal = await interaction.guild.channels.create({
        name: nomeCanal,
        type: ChannelType.GuildText,
        parent: config.ticketCategoryId,
        topic: criarMetaTicket(interaction.user.id, categoria, null),
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory
            ]
          },
          {
            id: config.staffRoleId,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory
            ]
          }
        ]
      });

      const mensagemCategoria = obterMensagemCategoria(categoria, interaction.user.toString());

      const ticketEmbed = new EmbedBuilder()
        .setColor('#111318')
        .setTitle(mensagemCategoria.titulo)
        .setDescription(mensagemCategoria.descricao)
        .setFooter({ text: 'Nova Paulistana Roleplay • Atendimento' });

      if (THUMBNAIL_URL && THUMBNAIL_URL.startsWith('http')) ticketEmbed.setThumbnail(THUMBNAIL_URL);

      await novoCanal.send({
        content: `${interaction.user} <@&${config.staffRoleId}>`,
        embeds: [ticketEmbed],
        components: [criarBotoesTicket()]
      });

      await interaction.reply({
        content: `✅ Seu ticket foi criado: ${novoCanal}`,
        flags: MessageFlags.Ephemeral
      });

      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'abrir_wl') {
        const member = await interaction.guild.members.fetch(interaction.user.id);

        if (!member.roles.cache.has(config.turistaRoleId)) {
          return await interaction.reply({
            content: '❌ Apenas quem possui o cargo Turista pode fazer a Whitelist.',
            flags: MessageFlags.Ephemeral
          });
        }

        const channelExistingSession = Array.from(wlSessions.values()).find(
          (session) => session.userId === interaction.user.id
        );

        if (channelExistingSession) {
          const existingChannel = interaction.guild.channels.cache.get(channelExistingSession.channelId);
          return await interaction.reply({
            content: existingChannel
              ? `❌ Você já possui uma whitelist em andamento: ${existingChannel}`
              : '❌ Você já possui uma whitelist em andamento.',
            flags: MessageFlags.Ephemeral
          });
        }

        if (wlApplications.has(interaction.user.id)) {
          return await interaction.reply({
            content: '❌ Sua whitelist já foi enviada para análise da equipe. Aguarde o resultado.',
            flags: MessageFlags.Ephemeral
          });
        }

        const nomeUsuario = normalizarTexto(interaction.user.username);
        const nomeCanal = `wl-${nomeUsuario}`.slice(0, 95);

        const novoCanal = await interaction.guild.channels.create({
          name: nomeCanal,
          type: ChannelType.GuildText,
          parent: config.wlCategoryId,
          topic: JSON.stringify({
            tipo: 'wl',
            ownerId: interaction.user.id,
            status: 'respondendo'
          }),
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory
              ]
            },
            {
              id: config.staffRoleId,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory
              ]
            }
          ]
        });

        createWlSession(novoCanal, interaction.user.id);

        await interaction.reply({
          content: `✅ Sua WL foi criada: ${novoCanal}`,
          flags: MessageFlags.Ephemeral
        });

        await novoCanal.send(
          `${interaction.user}, sua whitelist começou agora. Responda uma pergunta por vez.`
        );

        await askCurrentWlQuestion(novoCanal);
        return;
      }

      if (interaction.customId === 'assumir_ticket') {
        if (!staffPodeAtuar(interaction.member)) {
          return await interaction.reply({
            content: '❌ Apenas a equipe pode assumir tickets.',
            flags: MessageFlags.Ephemeral
          });
        }

        const meta = lerMeta(interaction.channel.topic);

        if (!meta || meta.tipo !== 'ticket') {
          return await interaction.reply({
            content: '❌ Não consegui identificar os dados desse ticket.',
            flags: MessageFlags.Ephemeral
          });
        }

        if (meta.assumedBy && meta.assumedBy !== interaction.user.id) {
          return await interaction.reply({
            content: `❌ Este ticket já foi assumido por <@${meta.assumedBy}>.`,
            flags: MessageFlags.Ephemeral
          });
        }

        if (meta.assumedBy === interaction.user.id) {
          return await interaction.reply({
            content: 'ℹ️ Você já assumiu este ticket.',
            flags: MessageFlags.Ephemeral
          });
        }

        meta.assumedBy = interaction.user.id;
        await interaction.channel.setTopic(JSON.stringify(meta));

        await interaction.reply({
          content: `👤 Ticket assumido por ${interaction.user}.`
        });

        return;
      }

      if (interaction.customId === 'fechar_ticket') {
        if (!staffPodeAtuar(interaction.member)) {
          return await interaction.reply({
            content: '❌ Apenas a equipe pode fechar tickets.',
            flags: MessageFlags.Ephemeral
          });
        }

        const meta = lerMeta(interaction.channel.topic);

        if (!meta || meta.tipo !== 'ticket' || !meta.ownerId) {
          return await interaction.reply({
            content: '❌ Não consegui identificar o dono desse ticket.',
            flags: MessageFlags.Ephemeral
          });
        }

        await interaction.reply({
          content: '🔒 Fechando ticket e gerando cópia das mensagens...'
        });

        let dmEnviada = false;

        try {
          const mensagens = await buscarTodasMensagens(interaction.channel);
          const transcriptTexto = montarTranscriptTexto(interaction.channel, mensagens);
          const buffer = Buffer.from(transcriptTexto, 'utf-8');

          const arquivo = new AttachmentBuilder(buffer, {
            name: `${interaction.channel.name}-transcript.txt`
          });

          const usuario = await client.users.fetch(meta.ownerId);

          if (usuario) {
            const embedDM = new EmbedBuilder()
              .setColor('#111318')
              .setTitle('📁 Cópia do seu ticket')
              .setDescription(
                [
                  'Seu ticket foi finalizado pela equipe.',
                  '',
                  `**Canal:** ${interaction.channel.name}`,
                  `**Servidor:** ${interaction.guild.name}`
                ].join('\n')
              )
              .setFooter({ text: 'Nova Paulistana Roleplay • Atendimento' });

            await usuario.send({
              embeds: [embedDM],
              files: [arquivo]
            });

            dmEnviada = true;
          }
        } catch (error) {
          console.error('Erro ao gerar/enviar transcript:', error);
        }

        await interaction.followUp({
          content: dmEnviada
            ? '✅ Cópia do ticket enviada no privado do usuário. Canal será apagado em 5 segundos.'
            : '⚠️ Não foi possível enviar a cópia no privado do usuário. Canal será apagado em 5 segundos.'
        });

        setTimeout(async () => {
          try {
            await interaction.channel.delete();
          } catch (error) {
            console.error('Erro ao deletar ticket:', error);
          }
        }, 5000);

        return;
      }
    }
  } catch (error) {
    console.error('Erro no interactionCreate:', error);

    if (interaction.replied || interaction.deferred) {
      try {
        await interaction.followUp({
          content: '❌ Ocorreu um erro ao processar sua solicitação.',
          flags: MessageFlags.Ephemeral
        });
      } catch {}
    } else {
      try {
        await interaction.reply({
          content: '❌ Ocorreu um erro ao processar sua solicitação.',
          flags: MessageFlags.Ephemeral
        });
      } catch {}
    }
  }
});

client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;

    const session = wlSessions.get(message.channel.id);
    if (!session) return;
    if (message.author.id !== session.userId) return;

    const question = wlQuestions[session.currentQuestionIndex];
    if (!question) return;

    clearWlTimeout(session);

    const validationError = question.validator ? question.validator(message.content) : null;

    if (validationError) {
      await message.channel.send(validationError);

      session.timeout = setTimeout(async () => {
        try {
          await message.channel.send('⏰ Tempo esgotado. Sua whitelist foi encerrada. Você precisará começar novamente.');
          removeWlSession(message.channel.id);
          setTimeout(async () => {
            try {
              await message.channel.delete();
            } catch {}
          }, 5000);
        } catch {}
      }, WL_TIMEOUT_MS);

      return;
    }

    session.answers[question.key] = message.content.trim();
    session.currentQuestionIndex += 1;

    if (session.currentQuestionIndex >= wlQuestions.length) {
      await finalizarWl(message.channel);
      return;
    }

    await message.channel.send('✅ Resposta recebida. Vamos para a próxima pergunta.');
    await askCurrentWlQuestion(message.channel);
  } catch (error) {
    console.error('Erro no messageCreate:', error);
  }
});

client.on('guildMemberAdd', async (member) => {
  try {
    // dar cargo turista
    try {
      await member.roles.add(config.turistaRoleId);
      console.log(`✅ Cargo Turista adicionado para ${member.user.tag}`);
    } catch (error) {
      console.error('❌ Erro ao adicionar cargo Turista:', error);
    }

    // buscar canal de boas-vindas
    const welcomeChannel = await member.guild.channels.fetch(config.welcomeChannelId).catch(() => null);

    if (!welcomeChannel || !welcomeChannel.isTextBased() || welcomeChannel.type !== ChannelType.GuildText) {
      console.error('❌ Canal de boas-vindas inválido.');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#111318')
      .setTitle('🎉 Bem-vindo à Nova Paulistana Roleplay')
      .setDescription(
        [
          `${member}, seja muito bem-vindo à **Nova Paulistana Roleplay**!`,
          '',
          'Seu cargo inicial de **Turista** foi adicionado automaticamente.',
          'Agora você já pode iniciar sua **Whitelist** para se tornar um **Morador** da cidade.',
          '',
          'Leia as informações do servidor com atenção e aproveite sua jornada.'
        ].join('\n')
      )
      .setFooter({
        text: 'Nova Paulistana Roleplay • Boas-vindas'
      })
      .setTimestamp();

    if (THUMBNAIL_URL && THUMBNAIL_URL.startsWith('http')) {
      embed.setThumbnail(THUMBNAIL_URL);
    }

    await welcomeChannel.send({
      content: `${member}`,
      embeds: [embed]
    });
  } catch (error) {
    console.error('❌ Erro no evento guildMemberAdd:', error);
  }
});

client.login(process.env.TOKEN);