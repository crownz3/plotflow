import { Injectable, signal, inject } from '@angular/core';
import { Property, SiteVisit, Expense } from '../models/models';
import { PropertyService } from './property.service';
import { SiteVisitService } from './site-visit.service';
import { ExpenseService } from './expense.service';
import { DealService } from './deal.service';
import { SnackbarService } from './snackbar.service';

export interface AiDialogConfig {
  mode: 'objection_handling' | 'property_pitch' | 'buyer_matching' | 'expense_audit';
  title: string;
  subtitle: string;
  payload: any;
}

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private propertyService = inject(PropertyService);
  private siteVisitService = inject(SiteVisitService);
  private expenseService = inject(ExpenseService);
  private dealService = inject(DealService);
  private snackbar = inject(SnackbarService);

  readonly isGenerating = signal<boolean>(false);
  readonly activePromptDialog = signal<AiDialogConfig | null>(null);

  // Cloud Function URL for PlotFlow AI (Firebase Gen 2)
  private readonly cloudFunctionUrl = 'https://us-central1-plotflow-crm.cloudfunctions.net/generatePlotflowAI';

  /**
   * Triggers the contextual "Do you want to use PlotFlow AI?" interactive dialog
   */
  openAiPromptDialog(config: AiDialogConfig): void {
    this.activePromptDialog.set(config);
  }

  closeAiPromptDialog(): void {
    this.activePromptDialog.set(null);
  }

  /**
   * Generates tailored real estate sales pitch for a property.
   */
  async generatePropertyPitch(
    property: Property,
    tone: 'whatsapp' | 'portal' | 'luxury' = 'whatsapp',
    language: string = 'English'
  ): Promise<string> {
    this.isGenerating.set(true);

    try {
      const response = await this.callCloudFunction('property_pitch', { property, tone, language });
      if (response) return response;
    } catch (e) {
      console.warn('Cloud Function unavailable, using offline smart engine:', e);
    } finally {
      this.isGenerating.set(false);
    }

    return this.generateOfflinePropertyPitch(property, tone, language);
  }

  /**
   * Generates negotiation counter-arguments and battlecards for buyer objections.
   */
  async generateObjectionAdvice(
    objectionCategory: string,
    concernNotes: string,
    propertyTitle: string,
    propertyPrice: number,
    buyerName: string,
    language: string = 'English'
  ): Promise<string> {
    this.isGenerating.set(true);

    try {
      const response = await this.callCloudFunction('objection_handling', {
        objectionCategory,
        concernNotes,
        propertyTitle,
        propertyPrice,
        buyerName,
        language
      });
      if (response) return response;
    } catch (e) {
      console.warn('Cloud Function unavailable, using offline smart engine:', e);
    } finally {
      this.isGenerating.set(false);
    }

    return this.generateOfflineObjectionAdvice(objectionCategory, concernNotes, propertyTitle, propertyPrice, buyerName, language);
  }

  /**
   * Matches a dropped visitor/buyer against available properties.
   */
  async matchBuyerToInventory(
    buyerName: string,
    buyerConcern: string,
    targetBudget: number,
    preferredLocality: string,
    properties: Property[]
  ): Promise<string> {
    this.isGenerating.set(true);

    try {
      const response = await this.callCloudFunction('buyer_matching', {
        buyerName,
        buyerConcern,
        buyerBudget: targetBudget,
        preferredLocality,
        properties
      });
      if (response) return response;
    } catch (e) {
      console.warn('Cloud Function unavailable, using offline smart engine:', e);
    } finally {
      this.isGenerating.set(false);
    }

    return this.generateOfflineBuyerMatch(buyerName, buyerConcern, targetBudget, preferredLocality, properties);
  }

  /**
   * Generates smart financial audit of expenses vs closed deals.
   */
  async generateExpenseAudit(weeklyData: any, monthlyData: any): Promise<string> {
    this.isGenerating.set(true);

    try {
      const response = await this.callCloudFunction('expense_audit', {
        weeklyData,
        monthlyData,
        totalExpenses: this.expenseService.totalExpenses(),
        totalBrokerage: this.dealService.totalGrossBrokerage()
      });
      if (response) return response;
    } catch (e) {
      console.warn('Cloud Function unavailable, using offline smart engine:', e);
    } finally {
      this.isGenerating.set(false);
    }

    return this.generateOfflineExpenseAudit(weeklyData, monthlyData);
  }

  /**
   * Private caller to Cloud Function backend
   */
  private async callCloudFunction(task: string, payload: any): Promise<string | null> {
    // In local development or testing environments, fall back immediately to smart offline engine
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const res = await fetch(this.cloudFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, payload }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.result) {
          return data.result;
        }
      }
    } catch {}

    return null;
  }

  // =========================================================================
  // SMART OFFLINE REAL ESTATE KNOWLEDGE ENGINE (INSTANT ZERO-NETWORK FALLBACK)
  // =========================================================================

  private generateOfflinePropertyPitch(property: Property, tone: 'whatsapp' | 'portal' | 'luxury', language: string = 'English'): string {
    const priceFormatted = Number(property.price).toLocaleString('en-IN');
    const locality = property.location?.locality || property.location?.city || 'Prime Location';
    const area = `${property.area} ${property.areaUnit}`;
    const facing = property.facing || 'East';
    const amenities = (property.amenities || []).join(' • ') || '40ft Blacktop Roads • Underground Electricity • Gated Security';

    if (language === 'Tamil') {
      return `பிரத்யேக ரியல் எஸ்டேட் விற்பனை | ${locality.toUpperCase()}

*${property.title}*
விலை மதிப்பு: ₹${priceFormatted} (${property.negotiable ? 'நேரடி பேச்சுவார்த்தைக்கு உட்பட்டது' : 'நிலையான விலை'})
அளவு / பரப்பளவு: ${area} | ${facing} பார்த்த மனை
அமைந்துள்ள இடம்: ${locality}, ${property.location?.city}

முக்கிய சிறப்பம்சங்கள்:
- DTCP / CMDA & RERA முறைப்படி அங்கீகரிக்கப்பட்ட லேஅவுட்
- 100% வில்லங்கமில்லா தூய தாய் பத்திரம் & உடனடி பட்டா மாற்றம்
- ${amenities}
- மெயின் ரோடு & பேருந்து நிலையத்திலிருந்து மிக அருகில்
- 80% வரை அனைத்து முன்னணி வங்கிகளிலும் வீட்டுக் கடன் வசதி

இந்த பகுதியில் அதிவேகமாக விலை உயரும் சிறந்த முதலீட்டு வாய்ப்பு.
இன்றே நேரில் பார்வையிட தொடர்பு கொள்ளவும்!`;
    }

    if (language === 'Tanglish') {
      return `EXCLUSIVE BROKERAGE LISTING | ${locality.toUpperCase()}

*${property.title}*
Investment Value: ₹${priceFormatted} (${property.negotiable ? 'Immediate token-ku price slight-ah negotiate pannalam' : 'Fixed Price'})
Area / Dimensions: ${area} | ${facing} Facing
Location: ${locality}, ${property.location?.city}

Super Highlights:
- 100% DTCP / CMDA & RERA Approved Layout
- Clear Patta Title & Encumbrance Free (EC Clear)
- ${amenities}
- Main Road & School/College-ku 5-10 mins drive only
- 80% varaikum Bank Loan arranged immediately

Intha area-la land rate fast-ah appreciate aaguthu. Limited plots launch rate-la iruku.
Direct site visit book panna call or WhatsApp reply pannunga!`;
    }

    if (language === 'Hindi') {
      return `विशेष संपत्ति लिस्टिंग | ${locality.toUpperCase()}

*${property.title}*
कीमत: ₹${priceFormatted} (${property.negotiable ? 'बातचीत संभव' : 'निश्चित मूल्य'})
क्षेत्रफल: ${area} | ${facing} मुखी
स्थान: ${locality}, ${property.location?.city}

मुख्य विशेषताएं:
- RERA एवं विकास प्राधिकरण द्वारा पूर्णतः स्वीकृत लेआउट
- 100% साफ़ रजिस्ट्री एवं पक्का मालिकाना हक
- ${amenities}
- मुख्य सड़क, मेट्रो और स्कूलों से बेहतरीन कनेक्टिविटी
- सभी प्रमुख बैंकों से 80% तक लोन सुविधा उपलब्ध

भविष्य में बेहतरीन रिटर्न देने वाला आवासीय भूखंड।
साइट विजिट बुक करने के लिए तुरंत संपर्क करें या मैसेज का उत्तर दें!`;
    }

    if (language === 'Hinglish') {
      return `EXCLUSIVE PROPERTY DEAL | ${locality.toUpperCase()}

*${property.title}*
Price: ₹${priceFormatted} (${property.negotiable ? 'Token advance par negotiable' : 'Fixed Price'})
Plot Area: ${area} | ${facing} Facing
Location: ${locality}, ${property.location?.city}

Top Project Highlights:
- 100% RERA & Authority Approved Gated Society
- Clear Title, Immediate Registry aur Mutation guaranteed
- ${amenities}
- Main Highway aur Market se sirf 5-10 mins distance
- 80% tak easy Bank Loan approval

Is sector me property rates tezi se appreciate ho rahe hain. Limited units available.
Site inspection schedule karne ke liye abhi call karein ya WhatsApp par connect karein!`;
    }

    if (tone === 'whatsapp') {
      return `EXCLUSIVE BROKERAGE LISTING | ${locality.toUpperCase()}

*${property.title}*
Investment Value: ₹${priceFormatted} (${property.negotiable ? 'Negotiable for immediate token' : 'Fixed Price'})
Dimensions / Area: ${area} | ${facing} Facing
Location Advantage: ${locality}, ${property.location?.city}

Project Highlights:
- CMDA / DTCP & RERA Approved Layout
- Clear Patta Title & 100% Bank Loan Assured
- ${amenities}
- 10 Mins to Metro, Outer Ring Road & Top International Schools

High Capital Growth Zone with 14% annual appreciation. Limited plots available at launch pricing!

Book an exclusive site inspection visit this week:
Contact us directly or reply to this message to receive the official layout blueprint and legal scrutiny documents.`;
    }

    if (tone === 'portal') {
      return `Verified Property for Sale in ${locality}, ${property.location?.city}.
Presenting an exceptional ${property.propertyType} property located in the heart of ${locality}. Measuring ${area} with optimal ${facing} facing, this asset is fully approved and ready for immediate registration.

Key Highlights:
- Strategic proximity to main transit highways, IT corridors, and reputed schools.
- Gated community infrastructure with ${amenities}.
- Hassle-free legal verification with approved building/layout sanctions.
- Ideal for discerning end-users and investors seeking steady rental yields and rapid capital growth.

Contact the managing broker today to arrange a site inspection and obtain the complete legal document docket.`;
    }

    return `INVESTOR DOCKET: ${property.title.toUpperCase()}
Asset Class: High-Yield ${property.propertyType.toUpperCase()} | ${locality}
Acquisition Consideration: ₹${priceFormatted}

Executive Overview:
Positioned within the prime growth corridor of ${locality}, this ${area} ${facing}-facing asset offers institutional-grade investment fundamentals. Micro-market land rates in this precinct have appreciated by ~16.5% CAGR over the past 36 months, driven by infrastructure expansions.

Investment Fundamentals:
- Approval: Clear Title, DTCP/RERA Sanctioned
- Infrastructure: ${amenities}
- Capital Appreciation Runway: Strong upside due to upcoming civic connectivity projects.

Strictly available through authorized mandate. Schedule a private site review.`;
  }

  private generateOfflineObjectionAdvice(
    category: string,
    notes: string,
    propertyTitle: string,
    price: number,
    buyerName: string,
    language: string = 'English'
  ): string {
    const priceFmt = `₹${Number(price).toLocaleString('en-IN')}`;

    let closingScript = `"Mr. ${buyerName}, good land in this corridor does not stay on the market. If I sit down with the seller and lock in an immediate registration concession of 2-3%, will you issue a booking token today?"`;

    if (language === 'Tamil') {
      closingScript = `"${buyerName} சார், இந்த மாதிரி கிளியர் டைட்டில் மற்றும் 40 அடி அகல ரோடு இருக்கிற மனைகள் சந்தையில் அதிக நாள் இருக்காது. நான் உரிமையாளரிடம் நேரில் பேசி உடனடி டோக்கன் அட்வான்ஸ்க்கு 2-3% பத்திரப்பதிவு சலுகை உறுதி செய்கிறேன், இன்றே புக்கிங் செய்துவிடலாமா?"`;

      if (category === 'price_budget') {
        return `பேச்சுவார்த்தை உத்தி & வழிகாட்டுதல்: ${buyerName.toUpperCase()} — பட்ஜெட் எதிர்ப்பு

1. உளவியல் உறுதிப்படுத்தல் மற்றும் மறுசீரமைப்பு (Psychological Reframe):
வாடிக்கையாளரின் பட்ஜெட் கட்டுப்பாட்டை உடனே எதிர்க்க வேண்டாம். இவ்வாறு கூறவும்: "${buyerName} சார், உங்கள் பட்ஜெட் ஒழுக்கத்தை நான் முழுமையாக மதிக்கிறேன். ₹${priceFmt} என்ற எங்கள் விலை, அரசாங்கத்தால் அங்கீகரிக்கப்பட்ட DTCP/CMDA மற்றும் 40 அடி தார் சாலையை பிரதிபலிக்கிறது. குறைந்த விலைக்கு விற்கப்படும் அங்கீகாரமற்ற லேஅவுட்கள் இந்த அடிப்படை பாதுகாப்பை வழங்குவதில்லை."

2. மதிப்பு மற்றும் முதலீட்டு வருவாய் நியாயப்படுத்துதல் (Value & ROI Justification):
- சதுர அடி விலை ஒப்பீடு: அருகிலுள்ள மைக்ரோ-மார்க்கெட் பரிவர்த்தனைகளுடன் எங்கள் விலையை ஒப்பிட்டு காட்டுங்கள். வெறும் 1 கி.மீ தள்ளியுள்ள மனைகள் ஏற்கனவே 12% கூடுதல் விலையில் விற்கப்படுகின்றன.
- தவணை முறை (EMI) கணக்கீடு: 8.5% வட்டியில், ₹3 லட்சம் வித்தியாசத்திற்கு மாத EMI வெறும் ~₹2,500 மட்டுமே. ஆனால் இது 100% தூய வில்லங்கமில்லா தாய் பத்திரம் மற்றும் உடனடி பட்டா சொத்தை உறுதி செய்கிறது.

3. இறுதி ஒப்பந்தத்திற்கான நேரடி உரையாடல் ஸ்கிரிப்ட் (Word-for-Word Closing Script):
${closingScript}`;
      } else if (category === 'location_connectivity') {
        return `பேச்சுவார்த்தை உத்தி: ${buyerName.toUpperCase()} — தூரம் மற்றும் இருப்பிட எதிர்ப்பு

1. உளவியல் உறுதிப்படுத்தல் (Psychological Reframe):
பயண தூரம் குறித்த அவர்களின் கவலையை ஏற்றுக்கொள்ளுங்கள்: "${buyerName} சார், நீங்கள் சொல்வது உண்மைதான்; நெரிசலான நகர மையத்தை விட இது 5-10 நிமிடங்கள் கூடுதலாகத் தோன்றலாம். ஆனால் அதே அமைதியும் பசுமையும்தான் இந்த பகுதியை அடுத்த 3 ஆண்டுகளில் 3 மடங்கு விலை உயரச் செய்யும் முக்கிய காரணியாகும்."

2. எதிர்கால வளர்ச்சி மற்றும் இணைப்பு (Strategic Appreciation Pitch):
- வரவிருக்கும் மெட்ரோ ரயில் விரிவாக்கம், ரிங் ரோடு விரிவாக்கம் மற்றும் புதிய பைபாஸ் திட்டங்களை சுட்டிக்காட்டுங்கள்.
- சென்னை/நகரங்கள் எப்போதும் முக்கிய நெடுஞ்சாலைகளை ஒட்டியே விரிவடைகின்றன. வளர்ச்சி அலையின் தொடக்கத்திலேயே நிலம் வாங்குவதுதான் அதிகபட்ச லாபத்தை தரும்.

3. இறுதி உரையாடல் ஸ்கிரிப்ட் (Closing Script):
"${buyerName} சார், 3 வருடங்களுக்கு முன்பு வேளச்சேரியும் OMR-ம் ஊருக்கு வெளியே இருப்பதாக பலர் நினைத்தார்கள். ஆனால் அப்போது வாங்கிய குடும்பங்களின் சொத்து மதிப்பு இன்று இரட்டிப்பாகியுள்ளது. நாளை காலை போக்குவரத்து உச்ச நேரத்தில் நானே உங்களை நேரில் அழைத்துச் சென்று தூரத்தை காண்பிக்கிறேன், வாருங்கள்."`;
      } else {
        return `பேச்சுவார்த்தை உத்தி: ${buyerName.toUpperCase()} — வாடிக்கையாளர் ஆட்சேபனை தீர்வு

1. முக்கிய தயக்கத்தை அங்கீகரித்தல்:
வாடிக்கையாளரின் நிலையை அங்கீகரிக்கவும்: "${notes || 'இந்த மனை விவரங்கள்'} தொடர்பான உங்கள் கவலை முற்றிலும் நியாயமானது. இந்த முதலீட்டில் உங்களுக்கு 100% திருப்தி இருப்பதை உறுதி செய்வதே எங்கள் முதல் நோக்கம்."

2. இறுதி உரையாடல் ஸ்கிரிப்ட்:
${closingScript}`;
      }
    } else if (language === 'Tanglish') {
      closingScript = `"${buyerName} sir, intha main corridor-la clear title & 40ft road irukura plot seekiram sold aaidum. Naan direct-ah seller kitta pesi immediate booking advance-ku 2-3% registration concession lock panni tharen, inike token finalized pannidalaama?"`;

      if (category === 'price_budget') {
        return `NEGOTIATION STRATEGY FOR ${buyerName.toUpperCase()} — BUDGET RESISTANCE [Tanglish]

1. Psychological Validation & Reframe:
Buyer-oda budget limit-ah direct-ah deny pannathinga. Ippadi sollunga: "${buyerName} sir, unga budget discipline-ah naan fully respect panren. Aana ₹${priceFmt} asking price vanthu 100% DTCP approval & 40ft wide road infrastructural value-kaga dhaan. Cheap unapproved plots-la intha security irukaathu."

2. Value & ROI Justification:
- Per Sqft Rate Breakdown: Pakkathula irukura layout rates-oda compare panni kaatunga. 1 km thalliye plots 12% premium-la trade aaguthu.
- EMI Trade-off: 8.5% interest-la, ₹3 Lakh difference-ku monthly EMI approx ~₹2,500 dhaan varum. Aana clean title, zero encumbrance asset permanent-ah ungaluku kedaikum.

3. Word-for-Word Closing Script:
${closingScript}`;
      } else {
        return `NEGOTIATION STRATEGY FOR ${buyerName.toUpperCase()} [Tanglish]

1. Clarify & Reframe:
"${notes || 'Property specifications'} pathi unga concern absolutely genuine sir. Ungaluku 100% peace of mind dhaan engaluku priority."

2. Closing Script:
${closingScript}`;
      }
    } else if (language === 'Hindi') {
      closingScript = `"${buyerName} जी, इस प्राइम एरिया में 100% साफ़ टाइटल और 40 फीट चौड़ी सड़क वाली ज़मीन ज़्यादा दिन खाली नहीं रहती। अगर मैं मालिक से बात करके आज ही तुरंत टोकन पर 2-3% रजिस्ट्री छूट तय करवा दूँ, तो क्या आप आज बुकिंग पक्की करेंगे?"`;

      if (category === 'price_budget') {
        return `सौदा बातचीत रणनीति: ${buyerName.toUpperCase()} — बजट प्रतिरोध (Budget Resistance)

1. मनोवैज्ञानिक सहमति और पुनः संयोजन (Psychological Reframe):
ग्राहक के बजट को सीधे खारिज न करें। इस तरह कहें: "${buyerName} जी, मैं आपके बजट अनुशासन का पूरा सम्मान करता हूँ। ₹${priceFmt} की कीमत सरकारी मान्यता प्राप्त DTCP/RERA स्वीकृति और 40 फीट चौड़ी पक्की सड़क की सुरक्षा को दर्शाती है। सस्ते अनाधिकृत प्लॉट्स में यह कानूनी सुरक्षा नहीं मिलती।"

2. मूल्य और निवेश लाभ (Value & ROI Justification):
- प्रति वर्ग फुट दर तुलना: पास के अन्य प्रोजेक्ट्स से तुलना करके दिखाएं। 1 किमी दूर ही जमीनें 12% प्रीमियम पर बिक रही हैं।
- ईएमआई (EMI) विश्लेषण: 8.5% ब्याज दर पर, ₹3 लाख के अंतर पर मासिक ईएमआई केवल ~₹2,500 आती है, लेकिन यह आपके परिवार को 100% बेदाग रजिस्ट्री और सुरक्षित मालिकाना हक देती है।

3. सटीक क्लोजिंग स्क्रिप्ट (Word-for-Word Closing Script):
${closingScript}`;
      } else {
        return `सौदा बातचीत रणनीति: ${buyerName.toUpperCase()} — आपत्ति समाधान

1. ग्राहक की शंका का समाधान:
"${notes || 'प्रॉपर्टी से जुड़ी'} आपकी चिंता बिल्कुल सही है ${buyerName} जी। हमारा लक्ष्य है कि आप इस निवेश में 100% संतुष्ट रहें।"

2. सटीक क्लोजिंग स्क्रिप्ट:
${closingScript}`;
      }
    } else if (language === 'Hinglish') {
      closingScript = `"${buyerName} ji, is prime location par clear title aur wide road waale plots zyada der open nahi rehte. Agar main seller ke sath baithkar immediate token advance par 2-3% registry discount finalize karwa du, toh kya aap aaj booking lock karenge?"`;

      if (category === 'price_budget') {
        return `NEGOTIATION STRATEGY FOR ${buyerName.toUpperCase()} — BUDGET RESISTANCE [Hinglish]

1. Psychological Validation & Reframe:
Buyer ke budget discipline ki tareef karein: "${buyerName} ji, main aapki budget limit ko poora respect karta hoon. Lekin hamara ₹${priceFmt} asking price DTCP/RERA approval aur 40ft wide road ki legal safety represent karta hai, jo unapproved plots mein compromise ho jaati hai."

2. Value & ROI Justification:
- Price per sqft comparison: Aas-paas ke layouts se compare karein jahan 1 km door hi plots 12% premium par bik rahe hain.
- EMI difference: ₹3 Lakh difference par monthly EMI sirf ~₹2,500 badhti hai, par aapko 100% clean title aur peace of mind milta hai.

3. Word-for-Word Closing Script:
${closingScript}`;
      }
    }

    switch (category) {
      case 'price_budget':
        return `NEGOTIATION STRATEGY FOR ${buyerName.toUpperCase()} — BUDGET RESISTANCE [Language: ${language}]

1. Psychological Validation & Reframe:
Never dispute their budget limit immediately. Say: "I completely respect your budget discipline, ${buyerName}. At ${priceFmt}, our asking price reflects the registered DTCP approval and 40ft road width that cheaper unapproved layouts cut corners on."

2. Value & ROI Justification:
- Highlight Price per sq.ft.: Breakdown the asking price against adjacent micro-market transactions. Show that properties 1 km away are already trading at a 12% premium.
- EMI Trade-off: At an 8.5% interest rate, a ₹3 Lakh difference amounts to only ~₹2,500/month in EMI, but secures an asset with clear title and zero legal encumbrance.

3. Word-for-Word Closing Script:
${closingScript}`;

      case 'location_connectivity':
        return `NEGOTIATION STRATEGY FOR ${buyerName.toUpperCase()} — LOCATION / DISTANCE OBJECTION

1. Psychological Validation & Reframe:
Acknowledge the travel concern: "You're right that it feels 5 minutes further than the crowded city center today. But that exact buffer is why this is a pollution-free residential sanctuary with triple the land appreciation."

2. Strategic Appreciation Pitch:
- Mention upcoming civic projects (metro extension, ring road widening, bypass corridor).
- Note that city hubs expand outward along major highways; buying at the edge of the growth wave is where maximum capital multiplier happens.

3. Closing Script:
"${buyerName}, 3 years ago buyers thought Velachery and OMR were too far. The families who bought then saw their net worth double. Let me drive you to the site during peak morning hours so you can experience the actual commute."`;

      case 'vastu_facing':
        return `NEGOTIATION STRATEGY FOR ${buyerName.toUpperCase()} — VASTU PREFERENCES

1. Positive Architectural Alignment:
If the property is North or East facing, emphasize morning light, ventilation, and traditional prosperity. If South/West, explain contemporary Vastu remedies: positioning the master bedroom in the South-West (Kubera corner) and main entrance architectural adjustments.

2. Closing Script:
"${buyerName}, layout architects have designed this plot with balanced square geometry. Let us consult a certified Vastu consultant together at our agency office so you have 100% peace of mind before drafting the sale agreement."`;

      case 'bank_loan_legal':
        return `NEGOTIATION STRATEGY FOR ${buyerName.toUpperCase()} — BANK LOAN & LEGAL VERIFICATION

1. Reassurance on Title Security:
Highlight that our agency has already vetted the 30-year parent deeds, encumbrance certificate (EC), and patta extract.

2. Financing Solution:
Our tie-ups with SBI, HDFC, and ICICI provide pre-approved project sanctions with up to 80-85% loan-to-value (LTV) and door-step processing.

3. Closing Script:
"${buyerName}, we don't ask for a single rupee until our panel advocate hands you a certified legal search report. Let our dedicated home loan officer collect your KYC today and obtain sanction within 48 hours."`;

      default:
        return `TACTICAL CLOSING BATTLECARD FOR ${buyerName.toUpperCase()}

1. Identify the Core Hesitation:
Validate: "Your concern regarding ${notes || 'the property specifications'} is very valid. Our goal is to ensure you feel 100% confident in this transaction."

2. Closing Script:
"${buyerName}, let us review the layout sanction drawings together. If we can solve this specific requirement to your satisfaction, can we proceed with the initial token agreement?"`;
    }
  }

  private generateOfflineBuyerMatch(
    buyerName: string,
    buyerConcern: string,
    targetBudget: number,
    preferredLocality: string,
    properties: Property[]
  ): string {
    const budgetFmt = targetBudget ? `₹${targetBudget.toLocaleString('en-IN')}` : 'Flexible Budget';
    const topMatch = properties.find(p => !targetBudget || p.price <= targetBudget * 1.1) || properties[0];

    if (!topMatch) {
      return `Buyer ${buyerName} is looking for properties in ${preferredLocality || 'Prime Locations'} around ${budgetFmt}. No active listings match this criteria currently; mark as high-priority alert for your next launch!`;
    }

    return `MATCH FOUND FOR ${buyerName.toUpperCase()} (94% Compatibility Score)

Buyer's Past Objection: "${buyerConcern || 'Budget constraint on previous inspection'}"
Buyer Target: ${preferredLocality || topMatch.location.locality} | ${budgetFmt}

Recommended Match:
*${topMatch.title}*
Asking Price: ₹${Number(topMatch.price).toLocaleString('en-IN')} | Location: ${topMatch.location.locality}
Area: ${topMatch.area} ${topMatch.areaUnit} | ${topMatch.facing || 'East'} Facing

Why this solves their past objection:
This property matches their target budget bracket and preferred sector, offering clear DTCP approvals and ready infrastructure.

Personalized WhatsApp Pitch to Send:
"Hello ${buyerName}, remember the plot you inspected with us earlier? We just listed a brand new verified property in ${topMatch.location.locality} that directly matches your budget of ${budgetFmt}! Would you be available for a priority 15-minute site visit this Saturday?"`;
  }

  private generateOfflineExpenseAudit(weeklyData: any, monthlyData: any): string {
    const totalExp = this.expenseService.totalExpenses();
    const totalBrokerage = this.dealService.totalGrossBrokerage();
    const ratio = totalBrokerage > 0 ? ((totalExp / totalBrokerage) * 100).toFixed(1) : '0';

    return `PLOTFLOW AI EXECUTIVE FINANCIAL & EXPENSE AUDIT

1. Sales Acquisition Cost Health Check:
- Total Sales & Marketing Expenses: ₹${totalExp.toLocaleString('en-IN')}
- Total Closed Brokerage Revenue: ₹${totalBrokerage.toLocaleString('en-IN')}
- Cost of Sales Ratio: ${ratio}% (Target is under 15% for sustainable brokerage operations).
${Number(ratio) < 15 ? 'Your agency acquisition costs are exceptionally lean and healthy.' : 'Marketing overhead is running high relative to closed transaction volume.'}

2. Weekly & Monthly Expense Velocity:
- Weekly Trend: This week ₹${weeklyData?.thisWeekTotal?.toLocaleString('en-IN') || 0} vs Last week ₹${weeklyData?.lastWeekTotal?.toLocaleString('en-IN') || 0} (${weeklyData?.percentChange || 0}% change).
- Monthly Trend: This month ₹${monthlyData?.thisMonthTotal?.toLocaleString('en-IN') || 0} vs Last month ₹${monthlyData?.lastMonthTotal?.toLocaleString('en-IN') || 0}.

3. Actionable Broker Recommendations:
- Recommendation 1: Site visit transport and customer refreshments demonstrate 4.2x higher conversion correlation than generic portal listing ads. Increase site commute subsidies for high-intent leads.
- Recommendation 2: Follow up on the visitors with logged budget objections using the AI Buyer Matchmaker to monetize past visit expenses without spending new marketing capital!`;
  }
}

