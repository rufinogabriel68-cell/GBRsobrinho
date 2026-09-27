"use client";

import { useEffect, useState } from "react";
import { subscribeClients, subscribeOrders, subscribeProducts } from "./db";
import type { Client, Order, Product } from "./types";

/** Assina a lista de clientes em tempo real (Firestore ou demo) */
export function useClients() {
  const [rows, setRows] = useState<Client[] | null>(null);
  useEffect(() => subscribeClients(setRows), []);
  return { clients: rows, loading: rows === null };
}

/** Assina a lista de produtos em tempo real (Firestore ou demo) */
export function useProducts() {
  const [rows, setRows] = useState<Product[] | null>(null);
  useEffect(() => subscribeProducts(setRows), []);
  return { products: rows, loading: rows === null };
}

/** Assina a lista de pedidos em tempo real (Firestore ou demo) */
export function useOrders() {
  const [rows, setRows] = useState<Order[] | null>(null);
  useEffect(() => subscribeOrders(setRows), []);
  return { orders: rows, loading: rows === null };
}
