import { SEOHead } from '@/components/seo/SEOHead';
import { MarketingLayout } from '@/components/layout/MarketingLayout';

const TERMS_PAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Terms of Service — Propera',
  description: 'Read the Terms of Service for using Propera.cc, operated by Propera PVT LTD.',
  url: 'https://propera.cc/terms',
};

export default function TermsOfServicePage() {
  return (
    <MarketingLayout>
      <SEOHead
        title="Terms of Service"
        description="Read the Terms of Service for using Propera.cc, the resort operations platform operated by Propera PVT LTD."
        canonicalUrl="/terms"
        keywords="propera terms of service, terms and conditions, user agreement"
        structuredData={TERMS_PAGE_SCHEMA}
      />

      <section className="pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Page header */}
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-3">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground mb-12">
            Last Updated: February 6, 2026
          </p>

          {/* Terms sections */}
          <div className="space-y-10 text-base leading-relaxed text-muted-foreground">
            {/* 1. Acceptance of Terms */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Propera.cc, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you may not access the Service.
              </p>
            </div>

            {/* 2. User Accounts */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. User Accounts</h2>
              <p>
                When you create an account with us, you must provide information that is accurate, complete, and current. Failure to do so constitutes a breach of the Terms. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.
              </p>
            </div>

            {/* 3. User Content */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. User Content</h2>
              <p className="mb-4">
                Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the legality, reliability, and appropriateness of the Content you post.
              </p>
              <p className="mb-4">
                By posting Content, you grant Propera PVT LTD a license to use, modify, perform, display, reproduce, and distribute such Content on and through the Service.
              </p>
              <p>
                You retain any and all of your rights to any Content you submit, post or display.
              </p>
            </div>

            {/* 4. Payments */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Payments</h2>
              <p>
                Currently, the Service is provided free of charge. We reserve the right to introduce fees or subscription charges in the future. Any changes to our pricing structure will be communicated to you in advance.
              </p>
            </div>

            {/* 5. Intellectual Property */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Intellectual Property</h2>
              <p>
                The Service and its original content (excluding Content provided by users), features, and functionality are and will remain the exclusive property of Propera PVT LTD and its licensors.
              </p>
            </div>

            {/* 6. Termination */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Termination</h2>
              <p>
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
            </div>

            {/* 7. Limitation of Liability */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Limitation of Liability</h2>
              <p>
                In no event shall Propera PVT LTD, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
              </p>
            </div>

            {/* 8. Governing Law */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Governing Law</h2>
              <p>
                These Terms shall be governed and construed in accordance with the laws of the Republic of Maldives, without regard to its conflict of law provisions.
              </p>
            </div>

            {/* 9. Changes */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Changes</h2>
              <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
              </p>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
