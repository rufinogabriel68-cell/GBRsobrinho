import type { Metadata } from "next";
import { ProductsView } from "@/components/views/products-view";

export const metadata: Metadata = {
  title: "Produtos",
};

export default function ProductsPage() {
  return <ProductsView />;
}
