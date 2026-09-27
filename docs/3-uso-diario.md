# Passo 3 — Usando no dia a dia

Este guia é a rotina recomendada para o painel virar parte do seu trabalho
(instalar no celular, fechar orçamento, mandar o link pro cliente, fechar o mês
e fazer backup).

---

## Instalar no celular (5 minutos, uma vez)

1. Abra o endereço do painel no navegador do celular.
2. Entre com a senha (`APP_PASSWORD`).
3. **iPhone (Safari)**: botão **Compartilhar** → **Adicionar à Tela de Início**.
   **Android (Chrome)**: menu **⋮** → **Instalar aplicativo**.
4. Pronto: o ícone azul “GBR” fica na tela inicial e abre em tela cheia.
5. Toque no botão de **sino** dentro de *Ajustes* para permitir notificações —
   assim você é avisado quando o cliente escreve no portal da OS.

## Rotina do dia

### Manhã (2 minutos)
- **Painel**: veja faturamento do mês, meta, OS em andamento, próximos
  compromissos e itens de estoque abaixo do mínimo.
- **Agenda**: confirme os atendimentos do dia (visão *Dia* ou *Semana*).
- **Estoque**: se algum item estiver no mínimo, registre a compra
  (*Movimentar → Entrada*) para o custo aparecer no financeiro.

### Durante o atendimento (no celular, direto do local)
1. **Orçamentos → Novo orçamento**: monte os itens, tire fotos do local
   (elas são reduzidas automaticamente antes de subir) e clique em **PDF**
   para mostrar/imprimir ou **WhatsApp** para enviar.
2. Cliente aprovou? **Ordens de Serviço → Nova OS**, vincule o cliente,
   escolha os serviços e use **Baixa de estoque automática** para dar saída
   no material usado.
3. Toque em **Link** e mande o endereço do portal no WhatsApp do cliente.
   Ele acompanha o status, conversa com você e assina o aceite — sem criar conta.
4. Vá mudando o status (Aberta → Agendada → Em andamento → Concluída) no
   cartão da OS; o cliente vê na hora.
5. No fim do serviço, peça a assinatura na tela ou pelo portal (**Aceite**).

### Fim do dia (1 minuto)
- **Financeiro → Novo lançamento**: registre entradas e saídas
  (material, combustível, taxa da maquininha).
- **Anotações**: registre o que ficou pendente ou orçamentos para revisar.

### Fim do mês (10 minutos)
1. **Ajustes → Backup** (baixa um JSON com tudo).
2. **Ajustes → Exportar** os CSVs que precisar (orçamentos, financeiro, OS…).
3. **Financeiro**: confira entradas, saídas, resultado e a meta do mês.
4. Guarde o backup no Google Drive/iCloud — assim você tem histórico mesmo se
   trocar de celular.

## Backup (importante!)

- **Automático**: o app guarda uma cópia no próprio aparelho (funciona offline).
- **Manual (faça 1x por mês)**: **Ajustes → Backup** → envie o arquivo para o
  Drive. O nome do arquivo traz a data (`gbr-backup-2026-09-27.json`).
- **Exportação por tabela**: botões de CSV em *Ajustes → Exportar e backup*
  (abre no Excel/Google Planilhas).
- Para restaurar, os dados precisam ser reinseridos (ou reaproveite o JSON com
  um script) — por isso o backup mensal é a sua rede de segurança.

## Orçamentos: o que faz o preço mudar

- **Faixa de preço** (Econômico / Médio / Premium) na calculadora usa a coluna
  correspondente da tabela de serviços.
- **Taxa da maquininha**: cadastre o percentual em *Ajustes → Taxas*; o valor
  “com cartão” mostra o preço que você precisa cobrar para receber cheio.
- **Desconto** e **validade** saem no PDF, junto com as condições de pagamento.

## Portal do cliente

- Cada OS tem um link próprio e secreto (`/portal/CÓDIGO`). Não divulgue links
  de OS antigas.
- O cliente pode: ver status e valor, conversar no chat, assinar o aceite. O
  aceite muda o status para **“Aprovada pelo cliente”**.
- Você recebe aviso no aparelho quando ele escreve (se autorizou notificações).

## Offline (obra sem sinal)

- Sem internet, o app continua abrindo com a última base sincronizada.
- O que você fizer entra numa **fila** e é enviado automaticamente quando a
  conexão voltar.
- O selo no topo mostra o estado: *Sincronizado · Enviando alterações… ·
  Offline — dados em cache · Sem conexão com o banco*. Toque nele para forçar
  o envio.

## Atalhos que economizam tempo

- **⌘K / Ctrl+K**: busca global (cliente, número da OS, orçamento, serviço, nota).
- **Botão de tema** no topo: claro → escuro → automático (segue o aparelho).
- **Arrastar** um compromisso na agenda para outro dia reagenda direto.
- **Vincular serviços** na OS soma horas estimadas e custos.

## O que ainda não é automático

- **E-mail e WhatsApp automáticos**: os botões em *Ajustes → Notificações*
  guardam a preferência, mas o envio real ainda não está ligado (precisa de um
  provedor: Z-API para WhatsApp ou um serviço de e-mail). Hoje o envio é manual,
  pelo botão **WhatsApp** de cada orçamento.
- **Resumo diário às 8h**: ainda não disparado (depende de tarefa agendada).
- **Anexos grandes**: fotos são reduzidas no aparelho; para arquivos pesados
  (vídeos, plantas em PDF), use o Drive e cole o link na anotação.
