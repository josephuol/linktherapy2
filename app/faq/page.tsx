import type { Metadata } from "next"
import Script from "next/script"
import { FaqSection } from "@/components/faq-section"
import Link from "next/link"

export const metadata: Metadata = {
  title: "FAQ — Therapy in Lebanon | LinkTherapy",
  description: "Frequently asked questions about psychotherapy, pricing, confidentiality, online sessions, and more in Lebanon.",
}

const faqData = [
  {
    question: "What is psychotherapy, and how can it help me?",
    answerText:
      "Psychotherapy in Lebanon, also called talk therapy, is a way to work through and solve emotional challenges, mental health issues, and behavioral problems with a licensed therapist. Whether you're dealing with anxiety, depression, trauma or relationship stress, therapy offers you support, answers, and coping tools skills that will accompany you during every challenge.",
    answer: (
      <p>
        Psychotherapy in Lebanon, also called talk therapy, is a way to work through and solve emotional challenges, mental health issues, and behavioral problems with a licensed therapist. Whether you&apos;re dealing with anxiety, depression, trauma or relationship stress, therapy offers you support, answers, and coping tools skills that will accompany you during every challenge.
      </p>
    ),
  },
  {
    question: "Do you offer in-person or online sessions in Lebanon?",
    answerText:
      "Yes. We offer in-person therapy sessions in Beirut, Jounieh, Zahle, Jbeil, Tripoli and surrounding areas, as well as secure online therapy across Lebanon so you can get mental health support whether you’re in Lebanon, or abroad.",
    answer: (
      <p>
        Yes. We offer in-person therapy sessions in Beirut, Jounieh, Zahle, Jbeil, Tripoli and surrounding areas, as well as secure online therapy across Lebanon so you can get mental health support whether you’re in Lebanon, or abroad.
      </p>
    ),
  },
  {
    question: "What types of therapy do you provide?",
    answerText:
      "Our therapy services in Lebanon include: Individual therapy for adults and teens; Relationship therapy and family counseling in Lebanon; Depression treatment specific to issues in Lebanon and also general issues; Anxiety therapy specific to issues in Lebanon and also general issues; Trauma and PTSD therapy related to problems specific to Lebanon or general problems; Grief and loss support; Stress management, life transitions, self-esteem and work related stress; Other specific issues such as existential problems, torture, and intense trauma.",
    answer: (
      <div className="space-y-2">
        <p>Our therapy services in Lebanon include:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Individual therapy for adults and teens</li>
          <li>Relationship therapy and family counseling in Lebanon</li>
          <li>Depression treatment specific to issues in Lebanon and also general issues</li>
          <li>Anxiety therapy specific to issues in Lebanon and also general issues</li>
          <li>Trauma and PTSD therapy related to problems specific to Lebanon or general problems</li>
          <li>Grief and loss support</li>
          <li>Stress management, life transitions, self-esteem and work related stress</li>
          <li>Other specific issues such as existential problems, torture, and intense trauma</li>
        </ul>
      </div>
    ),
  },
  {
    question: "How much does therapy cost in Lebanon?",
    answerText:
      "Therapy session costs in Lebanon range from $30 to $150, depending on the therapist and type of service but we make sure to offer affordable therapy sessions ($30-$60) in Lebanon and outside Lebanon/online ($50-$80) through sliding scale options. Therapy should not be expensive and though we too wish it would be free, we are doing our absolute best to find the top therapists in Lebanon within the affordable $30-$60 range so everyone can benefit.",
    answer: (
      <div className="space-y-3">
        <p>
          A typical therapy session lasts 50 minutes (sometimes referred to as a &quot;therapeutic hour&quot;). However,
          some therapists offer longer or shorter sessions depending on your needs and the type of therapy.
          Therapy session costs in Lebanon range from $30 to $150, depending on the therapist and type of service but we make sure to offer affordable therapy sessions ($30-$60) in Lebanon and outside Lebanon/online ($50-$80) through sliding scale options.
        </p>
        <p>
          Therapy should not be expensive and though we too wish it would be free, we are doing our absolute best to find the top therapists in Lebanon within the affordable $30-$60 range so everyone can benefit.
        </p>
      </div>
    ),
  },
  {
    question: "Is therapy confidential?",
    answerText:
      "Yes. All therapy sessions in clinics and online platform are confidential. We follow strict professional standards. Confidentiality is only broken in cases of serious, immediate harm, as per the law.",
    answer: (
      <p>
        Yes. All therapy sessions in clinics and online platform are confidential. We follow strict professional standards. Confidentiality is only broken in cases of serious, immediate harm, as per the law.
      </p>
    ),
  },
  {
    question: "How do I know if I need therapy?",
    answerText:
      "If you're feeling overwhelmed, anxious, down, or stuck in your relationships, it may be time. In other cases, you may not be feeling stuck but rather in a fog, in need of more clarity or stability. Therapy in Lebanon and abroad isn’t only for crises but also for growth and learning to balance your emotions.",
    answer: (
      <p>
        If you&apos;re feeling overwhelmed, anxious, down, or stuck in your relationships, it may be time. In other cases, you may not be feeling stuck but rather in a fog, in need of more clarity or stability. Therapy in Lebanon and abroad isn’t only for crises but also for growth and learning to balance your emotions.
      </p>
    ),
  },
  {
    question: "Are your therapists licensed?",
    answerText:
      "Absolutely. Our team is made up of licensed mental health professionals in Lebanon, trained at recognized universities that also have to go through our personal exams as well as an interview in order to be selected to work with us. Many also hold international certifications and are multilingual therapists (Arabic, English, French).",
    answer: (
      <p>
        Absolutely. Our team is made up of licensed mental health professionals in Lebanon, trained at recognized universities that also have to go through our personal exams as well as an interview in order to be selected to work with us. Many also hold international certifications and are multilingual therapists (Arabic, English, French).
      </p>
    ),
  },
  {
    question: "How many sessions will I need?",
    answerText:
      "It depends. On average, many people benefit from 6 to 12 sessions but often, they choose to stay longer depending on how much they are willing to grow and heal from. You can tailor a plan with your therapist to fit your specific goals. Overall, if you prefer faster, short term solutions, you may choose CBT. If you prefer long-term solutions, you may go for an analytical approach. We always make sure to choose the most skilled therapists so that you spend a minimum of time in therapy and save a maximum of time living your best life.",
    answer: (
      <div className="space-y-3">
        <p>
          It depends. On average, many people benefit from 6 to 12 sessions but often, they choose to stay longer depending on how much they are willing to grow
          If you don&apos;t feel a connection with your therapist after a few sessions, it&apos;s completely okay to switch.
          Therapy is most effective when you have a good relationship with your therapist. We can help you match
          with someone else who might be a better fit.
          You can tailor a plan with your therapist to fit your specific goals. Overall, if you prefer faster, short term solutions, you may choose CBT. If you prefer long-term solutions, you may go for an analytical approach. We always make sure to choose the most skilled therapists so that you spend a minimum of time in therapy and save a maximum of time living your best life.
        </p>
      </div>
    ),
  },
  {
    question: "Do you offer couples or family therapy?",
    answerText:
      "Yes. We provide relationship therapy and family counseling in Lebanon, both online and in person. We help couples and families improve communication and resolve conflict.",
    answer: (
      <p>
        Yes. We provide relationship therapy and family counseling in Lebanon, both online and in person. We help couples and families improve communication and resolve conflict.
      </p>
    ),
  },
  {
    question: "Is online therapy in Lebanon effective?",
    answerText:
      "Yes. Online counseling both in Lebanon and abroad is private, flexible, and backed by research. We use secure video platforms for all online therapy sessions.",
    answer: (
      <p>
        Yes. Online counseling both in Lebanon and abroad is private, flexible, and backed by research. We use secure video platforms for all online therapy sessions.
      </p>
    ),
  },
  {
    question: "What languages are sessions available in?",
    answerText:
      "Our Lebanese therapists are multilingual, just like the average Lebanese. We offer therapy in Arabic, English, and French.",
    answer: (
      <p>
        Our Lebanese therapists are multilingual, just like the average Lebanese. We offer therapy in Arabic, English, and French.
      </p>
    ),
  },
  {
    question: "Can I book a session online?",
    answerText:
      "Yes. You can book online sessions with a therapist in Lebanon even if you live abroad through our website or reach us by WhatsApp or phone. We'll help you schedule your first session and guide you if you're having trouble.",
    answer: (
      <p>
        Yes. You can book online sessions with a therapist in Lebanon even if you live abroad through our website or reach us by WhatsApp or phone. We'll help you schedule your first session and guide you if you're having trouble.
      </p>
    ),
  },
  {
    question: "What issues can therapy help with?",
    answerText:
      "We support clients facing: General anxiety and panic attacks; Low mood and depression; Burnout or stress from work/school; Relationship or family conflict; Trauma recovery and abuse; Self-esteem or identity struggles. We’re here to provide compassionate mental health care whether it's for growth, or day-to-day support.",
    answer: (
      <div className="space-y-2">
        <p>We support clients facing:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>General anxiety and panic attacks</li>
          <li>Low mood and depression</li>
          <li>Burnout or stress from work/school</li>
          <li>Relationship or family conflict</li>
          <li>Trauma recovery and abuse</li>
          <li>Self-esteem or identity struggles</li>
        </ul>
        <p>We’re here to provide compassionate mental health care whether it's for growth, or day-to-day support.</p>
      </div>
    ),
  },
  {
    question: "Is therapy covered by insurance?",
    answerText:
      "Some private insurers in Lebanon may cover part of the cost. It is best to ask your provider in this case.",
    answer: (
      <p>
        Some private insurers in Lebanon may cover part of the cost. It is best to ask your provider in this case.
      </p>
    ),
  },
  {
    question: "I'm nervous. What’s the first session like?",
    answerText:
      "That’s totally normal. The first session is just a conversation. Your therapist will ask about your goals and concerns and also get to know you, just as you will also get to know them. The first one to two sessions are usually made for the therapist to know more about you they can start helping you efficiently. Whether online or at one of our therapy clinics in Beirut, Zahle, Tripoli, Jbeil, Jounieh or Dbayeh, we’ll make sure you feel heard and at ease. You can always contact us regarding any inquiry.",
    answer: (
      <p>
        That&apos;s totally normal. The first session is just a conversation. Your therapist will ask about your goals and concerns and also get to know you, just as you will also get to know them. The first one to two sessions are usually made for the therapist to know more about you they can start helping you efficiently. Whether online or at one of our therapy clinics in Beirut, Zahle, Tripoli, Jbeil, Jounieh or Dbayeh, we’ll make sure you feel heard and at ease. You can always contact us regarding any inquiry.
      </p>
    ),
  },
]

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqData.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answerText,
      },
    })),
  }

  return (
    <>
      <Script id="faq-jsonld" type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </Script>
      <div className="min-h-screen bg-white">
        <FaqSection title="Frequently Asked Questions — Therapy in Lebanon" items={faqData.map(({ question, answer }) => ({ question, answer }))} single />
        <div className="container mx-auto px-4 pb-12">
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/" className="inline-flex items-center rounded-md bg-[#056DBA] px-5 py-3 text-white hover:bg-[#045A99] transition-colors">Book a session</Link>
            <a href="tel:+96179107042" className="inline-flex items-center rounded-md border border-gray-300 px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors">Contact us</a>
          </div>
        </div>
      </div>
    </>
  )
}


