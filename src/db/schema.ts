import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id"),
  name: text("name").notNull(),
  description: text("description"),
  priceEco: doublePrecision("price_eco").notNull().default(0),
  priceMed: doublePrecision("price_med").notNull().default(0),
  pricePrem: doublePrecision("price_prem").notNull().default(0),
  durationMinutes: integer("duration_minutes").default(60),
  materials: text("materials"),
  active: boolean("active").notNull().default(true),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  tags: jsonb("tags").$type<string[]>().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  clientId: integer("client_id"),
  title: text("title"),
  items: jsonb("items")
    .$type<{ serviceId?: number; name: string; qty: number; unit: number }[]>()
    .default([]),
  subtotal: doublePrecision("subtotal").default(0),
  discount: doublePrecision("discount").default(0),
  feePercent: doublePrecision("fee_percent").default(0),
  total: doublePrecision("total").default(0),
  status: text("status").notNull().default("aguardando"),
  validity: integer("validity").default(15),
  conditions: text("conditions"),
  notes: text("notes"),
  signature: text("signature"),
  photos: jsonb("photos").$type<string[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  token: text("token").notNull(),
  clientId: integer("client_id"),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("aberta"),
  scheduledAt: timestamp("scheduled_at"),
  address: text("address"),
  total: doublePrecision("total").default(0),
  costMaterials: doublePrecision("cost_materials").default(0),
  costTravel: doublePrecision("cost_travel").default(0),
  costLabor: doublePrecision("cost_labor").default(0),
  serviceIds: jsonb("service_ids").$type<number[]>().default([]),
  stockUsed: jsonb("stock_used").$type<{ id: number; qty: number }[]>().default([]),
  observations: text("observations"),
  signature: text("signature"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderMessages = pgTable("order_messages", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  author: text("author").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const stock = pgTable("stock", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("un"),
  quantity: doublePrecision("quantity").notNull().default(0),
  minQuantity: doublePrecision("min_quantity").default(2),
  unitCost: doublePrecision("unit_cost").default(0),
  location: text("location"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const stockMoves = pgTable("stock_moves", {
  id: serial("id").primaryKey(),
  stockId: integer("stock_id").notNull(),
  type: text("type").notNull(),
  quantity: doublePrecision("quantity").notNull(),
  note: text("note"),
  orderId: integer("order_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  allDay: boolean("all_day").default(false),
  color: text("color").default("#0071E3"),
  clientId: integer("client_id"),
  location: text("location"),
  notes: text("notes"),
});

export const finance = pgTable("finance", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(),
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull(),
  category: text("category"),
  entryDate: timestamp("entry_date").notNull(),
  orderId: integer("order_id"),
  method: text("method"),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body"),
  folder: text("folder").default("Geral"),
  tags: jsonb("tags").$type<string[]>().default([]),
  pinned: boolean("pinned").default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});
