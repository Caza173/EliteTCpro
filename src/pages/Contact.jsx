import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Mail, Linkedin, Twitter, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: 'support@elitetc.com',
        subject: `New Contact Form Submission from ${formData.name}`,
        body: `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`,
      });
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text-primary)' }}>
          Get in Touch
        </h1>
        <p className="text-base mb-12" style={{ color: 'var(--text-secondary)' }}>
          Have questions about EliteTC? Want to schedule a demo? Reach out to us using any method below.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Email */}
          <div
            className="p-6 rounded-lg"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-5 h-5" style={{ color: 'var(--gold)' }} />
              <h3 className="text-lg font-semibold">Email</h3>
            </div>
            <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
              Send us an email directly
            </p>
            <a
              href="mailto:support@elitetc.com"
              className="font-medium hover:underline"
              style={{ color: 'var(--gold)' }}
            >
              support@elitetc.com
            </a>
          </div>

          {/* LinkedIn */}
          <div
            className="p-6 rounded-lg"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Linkedin className="w-5 h-5" style={{ color: 'var(--gold)' }} />
              <h3 className="text-lg font-semibold">LinkedIn</h3>
            </div>
            <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
              Connect with us on LinkedIn
            </p>
            <a
              href="https://linkedin.com/company/elitetc"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline"
              style={{ color: 'var(--gold)' }}
            >
              Visit LinkedIn
            </a>
          </div>

          {/* Response Time */}
          <div
            className="p-6 rounded-lg"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-5 h-5" style={{ color: 'var(--gold)' }} />
              <h3 className="text-lg font-semibold">Response Time</h3>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              We respond to all inquiries within 24 business hours
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div
          className="p-8 rounded-lg"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text-primary)' }}>
            Send us a Message
          </h2>

          {submitted && (
            <div
              className="p-4 rounded-lg mb-6"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e' }}
            >
              Thank you! We've received your message and will get back to you soon.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Your name"
                className="w-full px-4 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
                className="w-full px-4 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Message
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                placeholder="Tell us how we can help..."
                rows="6"
                className="w-full px-4 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-2 rounded-lg font-medium text-sm transition-all"
              style={{
                backgroundColor: loading ? 'rgba(210, 163, 95, 0.5)' : 'var(--gold)',
                color: loading ? 'var(--text-muted)' : '#050506',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}