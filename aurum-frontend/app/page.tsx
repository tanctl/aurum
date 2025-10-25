"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, X, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";

const reasons = [
  {
    title: "Non-Custodial Payments",
    description:
      "Users keep control of their funds at all times. Payments execute directly from wallets through EIP-712 authorization.",
  },
  {
    title: "Cross-Chain Execution",
    description:
      "Built to operate seamlessly across Sepolia and Base with Avail data availability anchoring every subscription intent.",
  },
  {
    title: "Transparent & Verifiable",
    description:
      "Every payment event is stored on Avail DA and queryable through Envio for public verification.",
  },
  {
    title: "Analytics & Insights",
    description:
      "Merchants access real-time stats, token-level metrics, and subscription insights queried directly from Envio’s HyperIndex GraphQL API.",
  },
  {
    title: "Reliable Infrastructure",
    description:
      "Decentralized relayer network with batching, retries, and monitoring ensures on-time, fault-tolerant execution.",
  },
  {
    title: "Multi-Token Support",
    description:
      "Supports PYUSD for stable payments and ETH for cross-chain demos, extendable to any ERC-20 token.",
  },
];

const howItWorksSteps = [
  {
    title: "Sign",
    description: "Authorize a recurring intent (EIP-712).",
  },
  {
    title: "Execute",
    description: "Decentralized relayer processes on schedule.",
  },
  {
    title: "Verify",
    description: "Attestations recorded and publicly verifiable.",
  },
];

const faqItems = [
  {
    question: "How does Aurum ensure funds remain non-custodial?",
    answer:
      "Aurum never holds user assets. Subscriptions are authorized through EIP-712 signed intents, stored on Avail Data Availability, and executed by a decentralized relayer only when due. Users can revoke or cancel at any time.",
  },
  {
    question: "How are payments verified and tracked across chains?",
    answer:
      "Every subscription and payment event is indexed in real-time using Envio HyperIndex and anchored to Avail DA. This enables merchants and subscribers to prove payment history on any supported chain with public, verifiable data.",
  },
  {
    question: "How is Aurum different from other subscription/payment solutions?",
    answer:
      "Aurum is built from the ground up as a non-custodial, verifiable recurring-payment protocol. Unlike existing systems that rely on escrow contracts or centralized executions, Aurum ensures zero custody, cryptographic authorization, verifiable on-chain execution, and transparent cross-chain visibility.",
  },
  {
    question: "What tokens and networks are supported?",
    answer:
      "Aurum currently supports PYUSD and ETH on Sepolia and Base Sepolia, with support for additional ERC-20 tokens planned.",
  },
  {
    question: "How are protocol fees handled? ",
    answer:
      "Each payment includes a 0.5% on-chain protocol fee, enforced by the SubscriptionManager contract and split between the executing relayer and the protocol treasury. All fees are transparent and verifiable on-chain.",
  },
];

export default function LandingPage() {
  const [showDemo, setShowDemo] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(faqItems[0]?.question ?? null);

  function toggleFaq(question: string) {
    setOpenFaq((current) => (current === question ? null : question));
  }

  return (
    <div className="pb-24">
      {showDemo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foundation-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl bg-carbon/95 p-4">
            <button
              type="button"
              onClick={() => setShowDemo(false)}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-bronze/70 text-text-muted transition-colors hover:border-primary hover:text-primary"
              aria-label="Close demo"
            >
              <X size={18} />
            </button>
            <video src="/demo.mp4" controls autoPlay className="w-full bg-black" />
          </div>
        </div>
      ) : null}

      <section className="relative mx-auto flex max-w-6xl flex-col items-center gap-12 px-6 pt-16 text-center sm:pt-24">
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
          <span className="block text-text-primary">Decentralised Recurring Payments.</span>
          <span className="mt-3 block text-3xl md:text-4xl">
            <span className="text-primary">Automated.</span>{" "}
            <span className="text-secondary">Transparent.</span>{" "}
            <span className="text-primary">Non-custodial.</span>
          </span>
        </h1>
        <p className="max-w-2xl text-base text-text-muted md:text-lg">
          Automate on-chain subscriptions through EIP-712 signed intents, executed by a decentralized relayer network, with every payment verifiable and auditable on-chain.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard/merchant"
            className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-widest text-foundation-black transition-all hover:bg-secondary hover:text-foundation-black"
          >
            Open App
            <ArrowRight size={16} />
          </Link>
          <button
            type="button"
            onClick={() => setShowDemo(true)}
            className="inline-flex items-center gap-2 rounded-md border border-bronze px-6 py-3 text-sm font-semibold uppercase tracking-widest text-secondary transition-all hover:border-primary"
          >
            Watch Demo
          </button>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-6">
        <div className="mb-10 space-y-3">
          <h2 className="text-4xl font-semibold text-text-primary">Why Aurum?</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {reasons.map((reason) => (
            <div key={reason.title} className="card-surface h-full p-6 transition-transform hover:-translate-y-1">
              <h3 className="text-lg font-semibold text-text-primary">{reason.title}</h3>
              <p className="mt-3 text-sm text-text-muted leading-relaxed">{reason.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-6">
        <h2 className="text-3xl font-semibold text-text-primary">How it works</h2>
        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          {howItWorksSteps.map((step, index) => (
            <div key={step.title} className="flex items-center gap-4 md:flex-1">
              <div className="card-surface flex-1 p-6">
                <h3 className="text-lg font-semibold text-text-primary">{step.title}</h3>
                <p className="mt-2 text-sm text-text-muted">{step.description}</p>
              </div>
              {index < howItWorksSteps.length - 1 ? (
                <ChevronRight className="hidden h-6 w-6 text-primary md:block" />
              ) : null}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm font-medium text-text-muted">
          No custodial balances; funds stay in your wallet until each execution.
        </p>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-6">
        <h2 className="mb-8 text-3xl font-semibold text-text-primary">
          Built for both sides of Web3 payments
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card-surface p-6">
            <span className="text-xs uppercase tracking-[0.3em] text-secondary">For Merchants</span>
            <h3 className="mt-3 text-xl font-semibold text-text-primary">
              Accept recurring crypto payments with zero custody.
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              Configure subscription terms, rely on decentralized relayers, and reconcile payments with on-chain proof.
            </p>
          </div>
          <div className="card-surface p-6">
            <span className="text-xs uppercase tracking-[0.3em] text-secondary">For Subscribers</span>
            <h3 className="mt-3 text-xl font-semibold text-text-primary">
              Manage and verify your active subscriptions.
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              Pause, resume, or cancel with signed requests and audit every execution through public attestations.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-5xl px-6 text-center">
        <p className="text-base uppercase tracking-[0.4em] text-secondary">Powered by</p>
        <div className="mt-6 flex flex-col items-center gap-4 text-base text-text-primary md:flex-row md:justify-center md:gap-8">
          <span>
            <strong className="text-primary">Avail</strong> • Data availability & attestations
          </span>
          <span className="hidden text-text-muted md:inline">|</span>
          <span>
            <strong className="text-primary">Envio</strong> • Real-time indexing & analytics
          </span>
          <span className="hidden text-text-muted md:inline">|</span>
          <span>
            <strong className="text-primary">EIP-712</strong> • Typed signatures for secure intents
          </span>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-6">
        <h2 className="text-3xl font-semibold text-text-primary">Frequently asked questions</h2>
        <div className="mt-8 space-y-4">
          {faqItems.map((item) => {
            const isOpen = openFaq === item.question;
            return (
              <div key={item.question} className="card-surface p-6">
                <button
                  type="button"
                  onClick={() => toggleFaq(item.question)}
                  className="flex w-full items-center justify-between gap-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-semibold text-text-primary">{item.question}</span>
                  {isOpen ? (
                    <ChevronUp size={18} className="text-primary" />
                  ) : (
                    <ChevronDown size={18} className="text-text-muted" />
                  )}
                </button>
                {isOpen ? (
                  <p className="mt-3 text-sm text-text-muted leading-relaxed">{item.answer}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
