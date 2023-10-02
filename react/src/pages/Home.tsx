import { PolyButton } from "../components/PolyButton";
import { Testing } from "../components/Testing";
import InputStyled from "../components/UI/InputStyled";
import { CSVReader } from "../components/CSVReader";
import { useEffect, useState } from "react";
import { GetPosts } from "../services/api";

export function Home() {

  async function fetchData(){
    const myresponse = await GetPosts()

    console.log('🚀 ~ file: Home.tsx:13 ~ myresponse:', myresponse)
  }

  useEffect(() => {
    fetchData()
  }, [])
  return (
    <main className="flex flex-col max-w-[1200px] m-auto py-6 bg-yellow-400">
      <section className="flex items-center max-w-md justify-between m-auto gap-4">
        <PolyButton>Default</PolyButton>
        <PolyButton asChild>
          <div>as DIV</div>
        </PolyButton>
        <PolyButton asChild>
          <a href="#">as Anchor</a>
        </PolyButton>
      </section>
      <section className="flex items-center max-w-md justify-between m-auto gap-4">
        <InputStyled />
      </section>
      <section className="flex items-center max-w-md justify-between m-auto gap-4">
        <Testing />
      </section>
      <section className="flex items-center max-w-md justify-between m-auto gap-4">
        <CSVReader />
      </section>
    </main>
  );
}
