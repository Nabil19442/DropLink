import React, { useEffect } from 'react';
import { Navbar } from './components/layout/Navbar.jsx';
import { Footer } from './components/layout/Footer.jsx';
import { Hero } from './components/landing/Hero.jsx';
import { FeaturesSection } from './components/landing/FeaturesSection.jsx';
import { HowItWorksSection } from './components/landing/HowItWorksSection.jsx';
import { SecuritySection } from './components/landing/SecuritySection.jsx';
import { FaqSection } from './components/landing/FaqSection.jsx';
import { TransferWorkspace } from './components/transfer/TransferWorkspace.jsx';
import { ToastContainer } from './components/ui/Toast.jsx';

export default function App() {
  const scrollToWorkspace = () => {
    const el = document.getElementById('transfer-workspace');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // If a room parameter exists in the URL, automatically scroll to the workspace
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('room')) {
      setTimeout(() => {
        scrollToWorkspace();
      }, 200);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#080B18] text-[#F8FAFC] selection:bg-purple-600/30 selection:text-cyan-300 relative">
      {/* Subtle global grid background */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-20" />

      {/* Floating Toast notifications */}
      <ToastContainer />

      {/* Navigation Bar */}
      <Navbar onStartSharing={scrollToWorkspace} />

      {/* Landing Page Content */}
      <main className="relative z-10">
        <Hero
          onStartSharing={scrollToWorkspace}
          onSeeHowItWorks={scrollToHowItWorks}
        />

        {/* The Central Transfer Workspace */}
        <TransferWorkspace />

        <FeaturesSection />

        <HowItWorksSection />

        <SecuritySection />

        <FaqSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

