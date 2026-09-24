import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useAuth } from "../lib/auth";
import LandingNavbar from "../components/landing/LandingNavbar";
import HeroSection from "../components/landing/HeroSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import TestimonialsSection from "../components/landing/TestimonialsSection";
import FaqSection from "../components/landing/FaqSection";
import CtaBanner from "../components/landing/CtaBanner";
import LandingFooter from "../components/landing/LandingFooter";

export default function Home() {
  const { user, authReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authReady && user) router.replace("/dashboard");
  }, [authReady, user, router]);

  if (authReady && user) return null;

  return (
    <div className="tuf-landing">
      <Head>
        <title>TaskFlow — Teamwork, organized live</title>
        <meta
          name="description"
          content="TaskFlow is a collaborative task board: create projects, assign work, and watch boards update live as your team ships."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Hero now owns its transparent nav + floating preview */}
      <main id="main-content">
        <HeroSection />
        <FeaturesSection />
        <TestimonialsSection />
        <FaqSection />
        <CtaBanner />
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
