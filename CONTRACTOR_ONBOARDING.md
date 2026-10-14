# PARTI independent talent intake

## Routes

- Public direct link: `contractor-onboarding.html`
- Confirmation: `contractor-received.html`
- Protected team review: `operations-contractors.html`

The public route is intentionally absent from homepage navigation and uses `noindex`, `nofollow`, and `noarchive`. Anyone with the link can still open it, so the form does not collect a Social Security number, tax ID, banking information, driver license number, identity document, or signed tax form.

## Data and access

Run `supabase/contractor_onboarding.sql` in the existing PARTI Supabase project. Anonymous users can insert a profile but cannot read, update, or delete profiles. Authenticated users must pass the existing `is_parti_admin()` allowlist check to read or update the table.

Email notification code is intentionally not connected. New profiles appear in the protected Talent Network desk.

## Classification and legal review

The intake collects operational evidence relevant to business independence, including outside clientele, freedom to decline work, rate negotiation, public business presence, tools, business registration, work location, insurance, and ability to use assistants. Automated flags are routing prompts only and never a legal determination.

The page deliberately does not ask a person to waive unemployment, workers' compensation, wage, safety, retaliation, or classification rights. California status turns on the applicable legal test and the actual working relationship, not a label, 1099, invoice, LLC, or checkbox.

Before a person starts work, PARTI should separately complete:

1. A role-specific classification review under the current California test.
2. A written project agreement identifying deliverables, rate or payment amount, payment due date, term, expenses, intellectual property, confidentiality, cancellation, insurance, and safety responsibilities.
3. Secure W-9 or appropriate W-8 collection, vendor payment setup, and tax reporting.
4. Certificate of insurance review where applicable, plus workers' compensation verification for vendors with employees.
5. Project-specific safety orientation, site rules, required certifications, vehicle authorization, and incident reporting.
6. California EDD independent contractor reporting when the applicable threshold and conditions are met.

## Primary legal sources reviewed

- California Department of Industrial Relations, Independent contractor versus employee: https://www.dir.ca.gov/dlse/faq_independentcontractor.htm
- California EDD, Misclassified as an Independent Contractor: https://edd.ca.gov/en/unemployment/misclassified/
- California EDD, Independent Contractor Reporting: https://edd.ca.gov/en/payroll_taxes/Independent_Contractor_Reporting
- IRS, Forms and associated taxes for independent contractors: https://www.irs.gov/businesses/small-businesses-self-employed/forms-and-associated-taxes-for-independent-contractors
- California Privacy Protection Agency, General Notices: https://cppa.ca.gov/pdf/general_notices.pdf
- Cal/OSHA, Employer Responsibilities: https://www.dir.ca.gov/dosh/EmployerInformation.htm

This implementation is an operational intake, not legal advice. California counsel or a qualified HR/payroll professional should approve the final contractor agreement and review roles that overlap with PARTI's usual course of business.
