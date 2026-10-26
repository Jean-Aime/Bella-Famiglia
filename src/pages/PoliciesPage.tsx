import { Reveal } from '@/components/Reveal';
import { useBrand } from '@/contexts/BrandContext';

export function PoliciesPage() {
  const { brand } = useBrand();

  const sections = [
    {
      title: 'House Rules',
      content: [
        brand.houseRules,
        brand.childrenPolicy,
        brand.extraBedsPolicy,
        brand.paymentPolicy,
        brand.smokingPolicy,
        brand.petsPolicy,
        brand.ageRestriction,
        brand.spokenLanguages ? `Languages spoken: ${brand.spokenLanguages}.` : '',
      ].filter(Boolean).join('\n\n') || 'Please contact the host for the current house rules.',
    },
    {
      title: 'Cancellation Policy',
      content: brand.cancellationPolicy || 'Please contact the host for the cancellation and prepayment conditions for your selected dates.',
    },
    {
      title: 'Check-in & Check-out',
      content: `Check-in: ${brand.checkInWindow || `from ${brand.checkInTime}`}. Check-out: ${brand.checkOutWindow || `by ${brand.checkOutTime}`}. Please tell the property your arrival time in advance.`,
    },
    {
      title: 'Booking Conditions',
      content: 'A direct booking request is not confirmed until the host responds. The property accepts cash payments as described in the listing. Contact the host if you need to confirm the payment arrangements for your stay.',
    },
    {
      title: 'Privacy Policy',
      content: 'We collect only the information necessary to manage your booking and communicate with you. We do not share your data with third parties. Your contact details are used solely for reservation management and guest communication.',
    },
    {
      title: 'Liability',
      content: 'Guests are responsible for any damage caused to the property or its contents during their stay. Please report any issues immediately so we can address them quickly.',
    },
  ];

  return (
    <div className="pt-32 md:pt-40">
      <section className="container-editorial mb-20 md:mb-28">
        <Reveal>
          <p className="label-eyebrow mb-6">Policies</p>
          <h1 className="text-display-lg text-charcoal-900 font-display font-light text-balance max-w-3xl">
            The fine print,
            <span className="italic text-charcoal-400"> kept simple.</span>
          </h1>
        </Reveal>
      </section>

      <section className="container-editorial mb-24 md:mb-32">
        <div className="max-w-3xl">
          {sections.map((section) => (
            <Reveal key={section.title}>
              <div className="border-t border-sand-200 py-10">
                <h2 className="text-xl font-display font-normal text-charcoal-900 mb-4">{section.title}</h2>
                <p className="text-base leading-relaxed text-charcoal-600 font-light whitespace-pre-line">{section.content}</p>
              </div>
            </Reveal>
          ))}
          <div className="border-t border-sand-200 py-10">
            <p className="text-xs text-charcoal-400">
              The details shown here are managed by the property. Please confirm any special request directly with the host before travel.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
