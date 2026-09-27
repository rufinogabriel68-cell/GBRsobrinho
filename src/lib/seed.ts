import type { Persistence, Row, TableSlug } from "@/lib/db/types";

const d = (offsetDays: number, hour = 9, min = 0) => {
  const x = new Date();
  x.setDate(x.getDate() + offsetDays);
  x.setHours(hour, min, 0, 0);
  return x;
};

export const DEFAULT_SETTINGS = {
  company: {
    name: "GBR Soluções",
    tagline: "Seu sobrinho de aluguel",
    owner: "Gabriel Bispo",
    phone: "(11) 98842-3310",
    email: "contato@gbrsolucoes.com.br",
    document: "48.913.775/0001-04",
    address: "Rua das Palmeiras, 214 — Vila Mariana, São Paulo/SP",
    pix: "contato@gbrsolucoes.com.br",
  },
  goals: { monthly: 8000, savingsPct: 20 },
  fees: { cardPercent: 3.49, fixedFee: 0.4, pixPercent: 0 },
  pdf: {
    footer: "Orçamento válido conforme prazo indicado. Emitido por GBR Soluções.",
    conditions:
      "Pagamento: 50% na aprovação e 50% na conclusão. Materiais inclusos conforme itens descritos.",
    validity: 15,
    accent: "#0071E3",
  },
  notifications: { push: true, email: true, whatsapp: true, dailyBrief: true },
  profile: { fiscalMode: "mei" },
};

let seeding: Promise<void> | null = null;

/**
 * Semeia o banco na primeira execução (idempotente, inclusive com chamadas
 * concorrentes). Funciona igual para Postgres e Firestore.
 */
export async function ensureSeed(store: Persistence) {
  if (seeding) return seeding;
  seeding = runSeed(store).finally(() => {
    seeding = null;
  });
  return seeding;
}

async function insert(store: Persistence, table: TableSlug, rows: Row[]): Promise<Row[]> {
  return store.insertMany(table, rows);
}

async function runSeed(store: Persistence) {
  const existing = await store.list("services");
  if (existing.length > 0) return;

  const cats = await insert(store, "categories", [
      { name: "Elétrica", icon: "zap", color: "#FF9F0A" },
      { name: "CFTV", icon: "cctv", color: "#0A84FF" },
      { name: "Informática", icon: "monitor", color: "#64D2FF" },
      { name: "Serviços Gerais", icon: "wrench", color: "#30D158" },
      { name: "Automação", icon: "cpu", color: "#BF5AF2" },
  ]);

  const cat = (n: string) => Number(cats.find((c) => c.name === n)!.id);

  await insert(store, "services", [
    { categoryId: cat("Elétrica"), name: "Troca de disjuntor", description: "Substituição de disjuntor simples ou bipolar com teste de carga.", priceEco: 90, priceMed: 130, pricePrem: 180, durationMinutes: 45, materials: "Disjuntor, fita isolante, terminais" },
    { categoryId: cat("Elétrica"), name: "Instalação de tomada 2P+T", description: "Ponto novo em parede seca ou alvenaria, com verificação de aterramento.", priceEco: 80, priceMed: 120, pricePrem: 165, durationMinutes: 60, materials: "Tomada, conduit, 2,5mm²" },
    { categoryId: cat("Elétrica"), name: "Quadro de distribuição", description: "Montagem de QDR com barramento terra/neutro e identificação.", priceEco: 320, priceMed: 450, pricePrem: 620, durationMinutes: 180, materials: "QDR 12 módulos, DR, terminais" },
    { categoryId: cat("Elétrica"), name: "Chuveiro elétrico", description: "Instalação ou troca de chuveiro com verificação de seccionamento.", priceEco: 110, priceMed: 150, pricePrem: 210, durationMinutes: 60, materials: "Regulator, fio 6mm²" },
    { categoryId: cat("CFTV"), name: "Instalação câmera IP dome 4MP", description: "Fixação, passagem de cabo, crimpamento RJ45 e ajuste de imagem.", priceEco: 180, priceMed: 240, pricePrem: 320, durationMinutes: 90, materials: "Câmera dome, cabo CAT6, conector RJ45, POF" },
    { categoryId: cat("CFTV"), name: "Instalação de NVR + 4 câmeras", description: "Kit completo: cabeamento, configuração de rede, aplicativo no celular.", priceEco: 780, priceMed: 980, pricePrem: 1290, durationMinutes: 360, materials: "NVR, 4 câmeras, HD, switch POE, conectores" },
    { categoryId: cat("CFTV"), name: "Manutenção preventiva CFTV", description: "Limpeza de lentes, verificação de PoE, revisão de gravação.", priceEco: 150, priceMed: 220, pricePrem: 300, durationMinutes: 120, materials: "Limpa-lente, conectores" },
    { categoryId: cat("Informática"), name: "Formatação de notebook", description: "Backup, instalação de sistema, drivers e otimização.", priceEco: 140, priceMed: 190, pricePrem: 260, durationMinutes: 180, materials: "HD/SSD pendrive, pasta térmica" },
    { categoryId: cat("Informática"), name: "Montagem de PC sob medida", description: "Montagem, instalação de sistema, testes de estresse e entrega documentada.", priceEco: 250, priceMed: 350, pricePrem: 480, durationMinutes: 240, materials: "Componentes do cliente" },
    { categoryId: cat("Informática"), name: "Configuração de rede Wi-Fi", description: "Posicionamento de roteador, canal, QoS e cobertura.", priceEco: 120, priceMed: 170, pricePrem: 240, durationMinutes: 75, materials: "Cabo CAT6, switch" },
    { categoryId: cat("Serviços Gerais"), name: "Montagem de móveis", description: "Montagem de guarda-roupa, estante ou escritório conforme manual.", priceEco: 160, priceMed: 220, pricePrem: 300, durationMinutes: 150, materials: "Parafusos, buchas, cola madeira" },
    { categoryId: cat("Serviços Gerais"), name: "Instalação de ar-condicionado split", description: "Fixação de split e mono, vácuo e teste de pressão (sem gás extra).", priceEco: 380, priceMed: 470, pricePrem: 620, durationMinutes: 180, materials: "Suporte, tubulação, bomba de vácuo" },
    { categoryId: cat("Serviços Gerais"), name: "Reparo de infiltração", description: "Mapeamento da origem, selamento e acabamento discreto.", priceEco: 220, priceMed: 320, pricePrem: 450, durationMinutes: 200, materials: "Argamassa, impermeabilizante" },
    { categoryId: cat("Automação"), name: "Automação de portão eletrônico", description: "Instalação de motor, central, fotocélula e programação de cronômetro.", priceEco: 420, priceMed: 560, pricePrem: 740, durationMinutes: 240, materials: "Motor, central, fotocélula" },
    { categoryId: cat("Automação"), name: "Fechadura inteligente", description: "Instalação e pareamento de app, calibração de segredo.", priceEco: 190, priceMed: 260, pricePrem: 340, durationMinutes: 90, materials: "Fechadura, adaptador" },
    { categoryId: cat("Automação"), name: "Iluminação automatizada", description: "Instalação de dimmer/relay Wi-Fi e integração com assistente.", priceEco: 150, priceMed: 210, pricePrem: 290, durationMinutes: 120, materials: "Relay Wi-Fi, fio 1,5mm²" },
  ]);

  const clients = await insert(store, "clients", [
      { name: "Mariana Alcântara", phone: "(11) 99120-4471", email: "mariana.alcantara@gmail.com", address: "Rua Joaquim Távora, 512 — apto 91", city: "São Paulo", tags: ["recorrente", "indicou"], notes: "Prefere atendimento aos sábados de manhã." },
      { name: "Padaria Pão de Mel", phone: "(11) 3688-2210", email: "financeiro@paodeme.com.br", address: "Av. Nazaré, 1180", city: "São Paulo", tags: ["comercial", "CFTV"], notes: "CNPJ 21.774.900/0001-88. Nota fiscal obrigatória." },
      { name: "Roberto Tavares", phone: "(11) 98054-7712", email: "rctavares@uol.com.br", address: "Rua Harmonia, 76", city: "São Paulo", tags: ["novo"], notes: "" },
      { name: "Clínica Bem Viver", phone: "(11) 5051-9080", email: "admin@bemviver.med.br", address: "Rua Dr. Mário Cardim, 900 — sala 42", city: "São Paulo", tags: ["recorrente", "contrato"], notes: "Contrato mensal de manutenção. Faturar até o dia 10." },
      { name: "Anderson Luiz Prado", phone: "(11) 97744-2098", email: "anderson.prado@hotmail.com", address: "Rua Turiassu, 45", city: "São Paulo", tags: ["indicou"], notes: "" },
      { name: "Studio Vértice", phone: "(11) 99881-3345", email: "contato@studiovertice.com", address: "Al. Santos, 253 — conj. 8", city: "São Paulo", tags: ["comercial", "automação"], notes: "Janela de atendimento: 19h às 22h." },
  ]);
  const cl = (n: string) => Number(clients.find((c) => c.name === n)!.id);

  await insert(store, "quotes", [
    { number: "ORC-2026-0142", clientId: cl("Padaria Pão de Mel"), title: "CFTV 4 câmeras — salão e estoque", items: [{ name: "Instalação de NVR + 4 câmeras", qty: 1, unit: 980 }, { name: "Cabo CAT6 30m", qty: 2, unit: 78 }], subtotal: 1136, feePercent: 3.49, total: 1175.75, status: "aprovado", validity: 15, conditions: "Pagamento 50/50. Garantia de 90 dias na instalação.", createdAt: d(-6) },
    { number: "ORC-2026-0143", clientId: cl("Mariana Alcântara"), title: "Elétrica — 3 pontos e disjuntor", items: [{ name: "Instalação de tomada 2P+T", qty: 3, unit: 120 }, { name: "Troca de disjuntor", qty: 1, unit: 130 }], subtotal: 490, discount: 40, feePercent: 3.49, total: 467.8, status: "faturado", validity: 15, createdAt: d(-14) },
    { number: "ORC-2026-0144", clientId: cl("Studio Vértice"), title: "Automação de iluminação do estúdio", items: [{ name: "Iluminação automatizada", qty: 6, unit: 210 }], subtotal: 1260, feePercent: 3.49, total: 1303.97, status: "aguardando", validity: 20, createdAt: d(-2) },
    { number: "ORC-2026-0145", clientId: cl("Roberto Tavares"), title: "Montagem de escritório completo", items: [{ name: "Montagem de móveis", qty: 2, unit: 220 }], subtotal: 440, status: "recusado", validity: 15, createdAt: d(-9) },
    { number: "ORC-2026-0146", clientId: cl("Clínica Bem Viver"), title: "Manutenção preventiva trimestral", items: [{ name: "Manutenção preventiva CFTV", qty: 3, unit: 220 }], subtotal: 660, feePercent: 3.49, total: 683.03, status: "aprovado", validity: 30, createdAt: d(-1) },
  ]);

  const orders = await insert(store, "orders", [
    { number: "OS-2026-0087", token: "gbr-8f3k2d91qa", clientId: cl("Clínica Bem Viver"), title: "Manutenção preventiva CFTV — 3 pontos", description: "Limpeza das câmeras do corredor, revisão do NVR e teste de gravação das últimas 72h.", status: "em_andamento", scheduledAt: d(0, 14), address: "Rua Dr. Mário Cardim, 900 — sala 42", total: 683.03, costMaterials: 45, costTravel: 32, costLabor: 400, observations: "Cliente pediu relatório fotográfico." },
    { number: "OS-2026-0088", token: "gbr-2m7x5p04zb", clientId: cl("Mariana Alcântara"), title: "Instalação de 3 tomadas e troca de disjuntor", description: "Pontos na sala e no home office, troca do disjuntor do quarto.", status: "agendada", scheduledAt: d(1, 9), address: "Rua Joaquim Távora, 512 — apto 91", total: 467.8, costMaterials: 78, costTravel: 24, costLabor: 220 },
    { number: "OS-2026-0089", token: "gbr-5q1w8e67ty", clientId: cl("Padaria Pão de Mel"), title: "Implantação CFTV 4 câmeras", description: "Passagem de cabo em mezanino, instalação do NVR no backoffice e pareamento do app.", status: "aguardando_cliente", scheduledAt: d(2, 7), address: "Av. Nazaré, 1180", total: 1175.75, costMaterials: 512, costTravel: 40, costLabor: 480 },
    { number: "OS-2026-0090", token: "gbr-9z4c7r21uv", clientId: cl("Anderson Luiz Prado"), title: "Formatação de notebook + troca de SSD", description: "Backup dos arquivos, instalação do sistema e clonagem do perfil.", status: "concluida", scheduledAt: d(-4, 10), address: "Rua Turiassu, 45", total: 330, costMaterials: 190, costTravel: 18, costLabor: 140 },
  ]);
  const os = (n: string) => Number(orders.find((o) => o.number === n)!.id);

  await insert(store, "orderMessages", [
    { orderId: os("OS-2026-0087"), author: "gbr", body: "Bom dia! Confirmo o atendimento hoje às 14h. Vou levar os equipamentos de limpeza.", createdAt: d(-1, 18) },
    { orderId: os("OS-2026-0087"), author: "cliente", body: "Perfeito. A recepção já está avisada, é só chegar pela entrada dos funcionários.", createdAt: d(-1, 19) },
    { orderId: os("OS-2026-0088"), author: "gbr", body: "Oi Mariana, deixei agendado para amanhã às 9h. Consigo terminar antes do meio-dia.", createdAt: d(0, 8) },
    { orderId: os("OS-2026-0089"), author: "cliente", body: "Consegue subir o NVR em cima do armário? Ficaria fora de alcance.", createdAt: d(-2, 16) },
  ]);

  const stockRows = await insert(store, "stock", [
    { name: "Cabo CAT6 blindado", unit: "m", quantity: 120, minQuantity: 50, unitCost: 2.4, location: "Bagageiro — gaveta 1" },
    { name: "Conector RJ45", unit: "un", quantity: 34, minQuantity: 40, unitCost: 0.9, location: "Bagageiro — gaveta 1" },
    { name: "Disjuntor bipolar 32A", unit: "un", quantity: 6, minQuantity: 3, unitCost: 28.5, location: "Caixa azul" },
    { name: "Fio 2,5mm² (rollo 100m)", unit: "rollo", quantity: 2, minQuantity: 1, unitCost: 168, location: "Oficina" },
    { name: "Tomada 2P+T 10A", unit: "un", quantity: 18, minQuantity: 10, unitCost: 11.2, location: "Caixa azul" },
    { name: "Terminais tubulares", unit: "pct", quantity: 4, minQuantity: 5, unitCost: 9.9, location: "Caixa azul" },
    { name: "Parafuso 3,5x25", unit: "pct", quantity: 7, minQuantity: 4, unitCost: 14, location: "Oficina" },
    { name: "Etiqueta de identificação", unit: "un", quantity: 90, minQuantity: 30, unitCost: 0.35, location: "Caixa azul" },
  ]);
  const item = (n: string) => Number(stockRows.find((s2) => s2.name === n)!.id);

  await insert(store, "stockMoves", [
    { stockId: item("Cabo CAT6 blindado"), type: "out", quantity: 30, note: "OS-2026-0089 — cabeamento mezanino", orderId: os("OS-2026-0089"), createdAt: d(-2) },
    { stockId: item("Conector RJ45"), type: "in", quantity: 50, note: "Compra — Taquari Elétrica", createdAt: d(-8) },
    { stockId: item("Tomada 2P+T 10A"), type: "out", quantity: 3, note: "OS-2026-0088", orderId: os("OS-2026-0088"), createdAt: d(0, 8) },
  ]);

  await insert(store, "events", [
    { title: "Manutenção CFTV — Clínica Bem Viver", startAt: d(0, 14), endAt: d(0, 16), color: "#0A84FF", clientId: cl("Clínica Bem Viver"), location: "Rua Dr. Mário Cardim, 900", notes: "Levar escada e limpador de lentes." },
    { title: "Visita técnica — Studio Vértice", startAt: d(1, 19), endAt: d(1, 20, 30), color: "#BF5AF2", clientId: cl("Studio Vértice"), location: "Al. Santos, 253", notes: "Levantar pontos de tomada para orçamento de automação." },
    { title: "Instalação tomadas — Mariana", startAt: d(1, 9), endAt: d(1, 12), color: "#30D158", clientId: cl("Mariana Alcântara"), location: "Rua Joaquim Távora, 512" },
    { title: "Implantação CFTV — Pão de Mel", startAt: d(2, 7), endAt: d(2, 11), color: "#FF9F0A", clientId: cl("Padaria Pão de Mel"), location: "Av. Nazaré, 1180" },
    { title: "Retirada de material — Taquari", startAt: d(3, 8), endAt: d(3, 9), color: "#64D2FF", location: "Rua do Oratório, 320" },
    { title: "Fechar competência financeira", startAt: d(5, 18), endAt: d(5, 19), color: "#FF453A", notes: "Exportar CSV e enviar relatório mensal." },
  ]);

  await insert(store, "finance", [
    { kind: "in", description: "OS-2026-0090 — Formatação + SSD", amount: 330, category: "Serviços", entryDate: d(-4, 17), method: "Pix" },
    { kind: "in", description: "ORC-2026-0143 — Elétrica Mariana", amount: 467.8, category: "Serviços", entryDate: d(-12, 11), method: "Cartão" },
    { kind: "in", description: "Contrato mensal — Clínica Bem Viver", amount: 890, category: "Contratos", entryDate: d(-10, 9), method: "Pix" },
    { kind: "in", description: "Aporte inicial do mês", amount: 2400, category: "Serviços", entryDate: d(-8, 15), method: "Pix" },
    { kind: "in", description: "CFTV Pão de Mel (sinal 50%)", amount: 587.88, category: "Serviços", entryDate: d(-3, 10), method: "Transferência" },
    { kind: "out", description: "Compra de cabo CAT6 e conectores", amount: 214.4, category: "Materiais", entryDate: d(-8, 14) },
    { kind: "out", description: "Combustível — semana", amount: 132.9, category: "Deslocamento", entryDate: d(-6, 18) },
    { kind: "out", description: "Taxa da maquininha", amount: 46.2, category: "Taxas", entryDate: d(-12, 23) },
    { kind: "out", description: "Papelaria e consumíveis", amount: 58.75, category: "Administrativo", entryDate: d(-15, 11) },
    { kind: "out", description: "Manutenção da van (pneus)", amount: 480, category: "Veículo", entryDate: d(-16, 9) },
  ]);

  await insert(store, "notes", [
    { title: "Checklist antes de sair", body: "Crimpadora\nMultímetro com pinça\nParafusos 3,5x25 e buchas 5mm\nEtiqueta para identificação\nFita isolante e terminal\nCabo de extensão 10m\nMáscara e luvas", folder: "Operação", tags: ["checklist"], pinned: true, updatedAt: d(-2) },
    { title: "Preço dos serviços 2026", body: "Reajuste de 8% aprovado a partir de março.\nTomada 2P+T: 80 / 120 / 165\nCâmera dome: 180 / 240 / 320\nFormatação: 140 / 190 / 260\nNão fazer orçamento sem visitar o local acima de R$ 500.", folder: "Comercial", tags: ["preços"], updatedAt: d(-5) },
    { title: "Padaria Pão de Mel — pontos de atenção", body: "Entrada de funcionários às 6h. Instalar primeiro o NVR no backoffice, depois as câmeras. Pedem nota fiscal com CNPJ.", folder: "Clientes", tags: ["comercial"], updatedAt: d(-6) },
    { title: "Ideias para o app", body: "Pesquisa de satisfação automática 3 dias após o serviço.\nModelo de recibo com assinatura.\nRelatório mensal em PDF para enviar no dia 5.", folder: "Geral", tags: ["produto"], updatedAt: d(-20) },
  ]);

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await store.upsertSetting(key, value);
  }
}
