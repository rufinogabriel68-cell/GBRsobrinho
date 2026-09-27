import type { Metadata } from "next";
import { ClientsView } from "@/components/views/clients-view";

export const metadata: Metadata = {
  title: "Clientes",
};

export default function ClientsPage() {
  return <ClientsView />;
}
