import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { WhatYouCanDoSection } from "@/components/WhatYouCanDoSection";
import { ServicesGrid } from "@/components/ServicesGrid";
import { AudienceSection } from "@/components/AudienceSection";
import { Footer } from "@/components/Footer";
import { Chatbot } from "@/components/Chatbot";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <WhatYouCanDoSection />
      <ServicesGrid />
      <AudienceSection />
      <Footer />
      <Chatbot />
    </div>
  );
};

export default Index;
