
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { Footer } from "@/components/Footer";
import { Toaster } from "sonner";

const Index = () => {
  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          <Hero />
          <Features />
          <HowItWorks />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
