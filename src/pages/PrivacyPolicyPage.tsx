import { SEOHead } from '@/components/seo/SEOHead';
import { MarketingLayout } from '@/components/layout/MarketingLayout';

const PRIVACY_PAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Privacy Policy — Propera',
  description: 'Learn how Propera PVT LTD collects, uses, and protects your personal information.',
  url: 'https://propera.cc/privacy',
};

export default function PrivacyPolicyPage() {
  return (
    <MarketingLayout>
      <SEOHead
        title="Privacy Policy"
        description="Learn how Propera PVT LTD collects, uses, and protects your personal information when you use the Propera platform."
        canonicalUrl="/privacy"
        keywords="propera privacy policy, data protection, personal information, cookies"
        structuredData={PRIVACY_PAGE_SCHEMA}
      />

      <section className="pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Page header */}
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground mb-12">
            Last Updated: February 6, 2026
          </p>

          {/* Policy sections */}
          <div className="space-y-10 text-base leading-relaxed text-muted-foreground">
            {/* 1. Introduction */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Introduction</h2>
              <p>
                Propera PVT LTD ("we," "us," or "our") operates the web application Propera.cc (the "Service"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share information about you when you use our Service.
              </p>
            </div>

            {/* 2. Information We Collect */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Information We Collect</h2>
              <p className="mb-4">
                We collect information you provide directly to us. This includes:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-1">
                <li>
                  <span className="font-medium text-foreground">Personal Information:</span> Name, email address, phone number, and any other information you choose to provide.
                </li>
                <li>
                  <span className="font-medium text-foreground">User Content:</span> Information regarding activities, dining, or other content you upload to the Service.
                </li>
              </ul>
            </div>

            {/* 3. Use of Information */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Use of Information</h2>
              <p className="mb-4">We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 pl-1">
                <li>Provide, maintain, and improve our Service.</li>
                <li>Respond to your comments, questions, and customer support requests.</li>
                <li>Monitor and analyze trends, usage, and activities in connection with our Service.</li>
              </ul>
            </div>

            {/* 4. Sharing of Information */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Sharing of Information</h2>
              <p className="mb-4">
                We share personal information with third-party vendors, consultants, and other service providers who need access to such information to carry out work on our behalf, including:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-1">
                <li>Hosting services</li>
                <li>Analytics providers</li>
                <li>Operational tools</li>
              </ul>
              <p className="mt-4">We do not sell your personal information to third parties.</p>
            </div>

            {/* 5. Cookies and Tracking */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Cookies and Tracking</h2>
              <p>
                We use cookies and similar tracking technologies to track the activity on our Service and hold certain information (e.g., to keep you logged in). You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.
              </p>
            </div>

            {/* 6. Data Security */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Security</h2>
              <p>
                We take reasonable measures to help protect information about you from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction.
              </p>
            </div>

            {/* 7. Jurisdiction */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Jurisdiction</h2>
              <p>
                This Policy shall be governed and construed in accordance with the laws of the Republic of Maldives, without regard to its conflict of law provisions.
              </p>
            </div>

            {/* 8. Contact Us */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at{' '}
                <a href="mailto:hello@propera.io" className="text-primary hover:underline">
                  hello@propera.io
                </a>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
