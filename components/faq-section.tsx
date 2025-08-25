"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface FaqItem {
  question: string
  answer: React.ReactNode
}

export function FaqSection({ id = "faq", items, title = "Frequently Asked Questions — Therapy in Lebanon", single = true }: { id?: string; items: FaqItem[]; title?: string; single?: boolean }) {
  return (
    <section id={id} className="bg-white mt-16">
      <div className="container mx-auto px-4 pt-16 pb-8">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 mb-6">{title}</h2>
        <p className="text-base md:text-lg text-gray-700 mb-10 max-w-3xl leading-relaxed">Get clear answers to common questions about psychotherapy and our services in Lebanon.</p>
        <div className="rounded-xl border border-gray-200 shadow-sm">
          <Accordion type={single ? "single" : "multiple"} collapsible>
            {items.map((item, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`}>
                <AccordionTrigger className="text-left text-gray-900 hover:text-[#056DBA] px-4 md:px-6 text-base md:text-lg font-semibold">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-700 leading-relaxed px-4 md:px-6 text-sm md:text-base">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}


