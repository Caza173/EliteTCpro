import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function About() {
  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)' }} className="pt-8 pb-16">
      {/* Back Button */}
      <div className="max-w-4xl mx-auto px-6 mb-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--gold)' }}>
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-8" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text-primary)' }}>
          About EliteTC
        </h1>

        <div className="space-y-6 leading-relaxed text-base" style={{ color: 'var(--text-secondary)' }}>
          <p>
            EliteTC is a comprehensive transaction coordination platform purpose-built for modern real estate teams. We understand that managing complex real estate transactions involves juggling dozens of documents, deadlines, stakeholders, and compliance requirements. Our platform consolidates all of these moving parts into a single, intuitive workspace where coordination becomes seamless.
          </p>

          <p>
            EliteTC is designed for Transaction Coordinators (TCs), brokers, agents, and administrative professionals who are tired of managing deals across scattered emails, spreadsheets, and communication platforms. Whether you're coordinating buyer-side transactions, listing-side deals, or managing teams across multiple properties, EliteTC provides the tools to stay organized, meet deadlines, and ensure nothing falls through the cracks.
          </p>

          <p>
            Our platform features intelligent deadline tracking, automated compliance checking, real-time collaboration tools, document management, and AI-powered insights that flag risks before they become problems. Integration with popular platforms like Dotloop, SkySope, Google Calendar, and Gmail keeps your workflow connected to the tools you already trust. Built on enterprise-grade infrastructure, EliteTC scales from solo practitioners to large brokerages managing hundreds of concurrent transactions.
          </p>

          <p>
            EliteTC is developed by a team of real estate technology veterans and software engineers who have spent years in transaction coordination roles. We've lived through the frustrations of manual coordination—the missed deadlines, the lost documents, the endless status update calls. Every feature in EliteTC was built to solve a real problem we experienced firsthand in the field. We're committed to continuous improvement, listening to our users, and evolving the platform to meet the demands of modern real estate commerce.
          </p>

          <p>
            Our mission is simple: empower real estate professionals with technology that works as hard as they do.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="mt-12 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
          <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text-primary)' }}>
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: 'Smart Deadlines', desc: 'AI-powered deadline tracking with intelligent reminders and risk alerts' },
              { title: 'Document Management', desc: 'Centralized file storage with compliance scanning and version control' },
              { title: 'Team Collaboration', desc: 'Real-time updates, task assignment, and seamless communication' },
              { title: 'Integrations', desc: 'Connect to Dotloop, SkySope, Gmail, Google Calendar, and more' },
              { title: 'Compliance Monitoring', desc: 'Automated checks for document signatures, required fields, and contingencies' },
              { title: 'Analytics & Reporting', desc: 'Data-driven insights into transaction health and team performance' },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'rgba(210, 163, 95, 0.05)', border: '1px solid rgba(210, 163, 95, 0.15)' }}
              >
                <h3 className="font-semibold mb-2" style={{ color: 'var(--gold)' }}>
                  {feature.title}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}