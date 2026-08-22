
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, formatStr: string = "PPP") {
  if (!date) return "N/A";
  return format(new Date(date), formatStr);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function getRandomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Generate example cases for demo purposes
export function generateExampleCases(count: number = 10) {
  const caseTypes = [
    "Civil", "Criminal", "Family", "Bankruptcy", "Employment", 
    "Intellectual Property", "Immigration", "Personal Injury", "Tax"
  ];
  
  const courts = [
    "Supreme Court", "District Court", "Circuit Court", "Federal Court", 
    "State Court", "Appellate Court", "Family Court", "Bankruptcy Court"
  ];
  
  const jurisdictions = ["Federal", "State", "Local", "International"];
  
  const statuses = ["active", "pending", "closed"];
  
  const cases = [];
  
  for (let i = 0; i < count; i++) {
    const id = `case-${i + 1}`;
    const party1 = getRandomElement(["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson"]);
    const party2 = getRandomElement(["Johnson", "Smith", "Tech Corp", "Industries LLC", "MegaCorp", "Insurance Co.", "Bank", "City of Springfield", "Department of Justice"]);
    
    const now = new Date();
    const pastDate = new Date(now.getFullYear() - 1, 0, 1);
    const futureDate = new Date(now.getFullYear() + 1, 11, 31);
    
    const filingDate = getRandomDate(pastDate, now);
    const hasNextDate = Math.random() > 0.3;
    const nextDate = hasNextDate ? getRandomDate(now, futureDate) : null;
    
    const yearNum = getRandomInt(2020, 2024);
    const caseNum = getRandomInt(1000, 9999);
    
    // Generate random hearings
    const hearingsCount = getRandomInt(0, 5);
    const hearings = [];
    
    for (let j = 0; j < hearingsCount; j++) {
      const hearingDate = getRandomDate(filingDate, futureDate);
      
      hearings.push({
        id: crypto.randomUUID(),
        case_id: id,
        title: getRandomElement([
          "Initial Hearing", "Status Conference", "Motion Hearing", 
          "Pre-Trial Conference", "Trial", "Sentencing", "Mediation"
        ]),
        date: hearingDate.toISOString(),
        location: getRandomElement([
          "Courtroom A", "Courtroom B", "Courtroom 123", 
          "Judge's Chambers", "Grand Courtroom", "Virtual"
        ]),
        judge: getRandomElement([
          "Judge Thomas", "Judge Martinez", "Judge Johnson", 
          "Judge Williams", "Judge Chen", "Judge Patel"
        ]),
        notes: getRandomElement([
          "Bring all discovery documents", 
          "Witness testimony scheduled", 
          "Settlement discussions expected",
          "Opposing counsel requested continuance",
          "Final arguments",
          ""
        ]),
        status: hearingDate > now ? "scheduled" : "completed",
        created_at: filingDate.toISOString(),
        updated_at: now.toISOString()
      });
    }
    
    cases.push({
      id,
      user_id: 'demo-user',
      party_name: `${party1} v. ${party2}`,
      case_number: `CV-${yearNum}-${caseNum}`,
      court_name: getRandomElement(courts),
      jurisdiction: getRandomElement(jurisdictions),
      case_type: getRandomElement(caseTypes),
      filing_date: filingDate.toISOString(),
      status: getRandomElement(statuses),
      next_date: nextDate ? nextDate.toISOString() : null,
      created_at: filingDate.toISOString(),
      updated_at: now.toISOString(),
      hearings
    });
  }
  
  return cases;
}

// Generate example documents for demo purposes
export function generateExampleDocuments(count: number = 10) {
  const documentTypes = [
    "Contract", "Brief", "Motion", "Pleading", "Discovery", 
    "Settlement Agreement", "Affidavit", "Legal Memo", "Court Order"
  ];
  
  const statuses = ["Draft", "Review", "Final", "Filed", "Archived"];
  
  const documents = [];
  
  for (let i = 0; i < count; i++) {
    const now = new Date();
    const pastDate = new Date(now.getFullYear() - 1, 0, 1);
    
    const createdDate = getRandomDate(pastDate, now);
    const modifiedDate = getRandomDate(createdDate, now);
    
    documents.push({
      id: crypto.randomUUID(),
      name: `${getRandomElement(documentTypes)} - ${getRandomElement(["Smith", "Johnson", "Williams", "Tech Corp", "Case Summary", "Legal Analysis", "Consultation"])}`,
      type: getRandomElement(documentTypes),
      size: getRandomInt(100, 5000),
      status: getRandomElement(statuses),
      tags: shuffleArray(["Important", "Urgent", "Confidential", "Client", "Contract", "Evidence"]).slice(0, getRandomInt(0, 3)),
      created: createdDate.toISOString(),
      modified: modifiedDate.toISOString(),
      shared_with: getRandomInt(0, 5),
      case_id: Math.random() > 0.3 ? crypto.randomUUID() : null,
      case_name: Math.random() > 0.3 ? `${getRandomElement(["Smith", "Johnson", "Williams"])} v. ${getRandomElement(["Tech Corp", "Industries LLC", "Insurance Co."])}` : null
    });
  }
  
  return documents;
}

// Generate example search results for legal search
export function generateExampleSearchResults(count: number = 20) {
  const caseNames = [
    "Brown v. Board of Education", "Roe v. Wade", "Miranda v. Arizona",
    "Gideon v. Wainwright", "Marbury v. Madison", "Plessy v. Ferguson",
    "District of Columbia v. Heller", "Obergefell v. Hodges", "Citizens United v. FEC",
    "New York Times Co. v. Sullivan", "Mapp v. Ohio", "United States v. Nixon"
  ];
  
  const statutes = [
    "42 U.S.C. § 1983", "15 U.S.C. § 1", "17 U.S.C. § 107",
    "35 U.S.C. § 101", "18 U.S.C. § 1343", "29 U.S.C. § 794",
    "26 U.S.C. § 501", "5 U.S.C. § 552", "47 U.S.C. § 230"
  ];
  
  const legalTopics = [
    "First Amendment", "Fourth Amendment", "Due Process", 
    "Equal Protection", "Copyright", "Patent", "Trademark", 
    "Contract Law", "Tort Law", "Family Law", "Environmental Law"
  ];
  
  const jurisdictions = [
    "U.S. Supreme Court", "9th Circuit", "2nd Circuit", 
    "California Supreme Court", "New York Court of Appeals", 
    "Delaware Chancery Court", "Texas Supreme Court"
  ];
  
  const years = Array.from({ length: 70 }, (_, i) => 1950 + i);
  
  const results = [];
  
  for (let i = 0; i < count; i++) {
    const resultType = Math.random() > 0.7 ? "statute" : "case";
    const year = getRandomElement(years);
    
    if (resultType === "case") {
      const citations = [
        `${getRandomInt(100, 999)} U.S. ${getRandomInt(100, 999)}`,
        `${getRandomInt(10, 99)} F.3d ${getRandomInt(100, 999)}`,
        `${getRandomInt(10, 99)} Cal. ${getRandomInt(1, 5)}th ${getRandomInt(100, 999)}`
      ];
      
      results.push({
        id: crypto.randomUUID(),
        type: "case",
        title: getRandomElement(caseNames),
        citation: getRandomElement(citations),
        jurisdiction: getRandomElement(jurisdictions),
        year: year,
        summary: `This case established important precedent regarding ${getRandomElement(legalTopics)} law. The Court held that...`,
        relevance: getRandomInt(70, 99),
        topics: shuffleArray(legalTopics).slice(0, getRandomInt(1, 3)),
        url: `https://example.com/cases/${crypto.randomUUID()}`
      });
    } else {
      results.push({
        id: crypto.randomUUID(),
        type: "statute",
        title: getRandomElement(statutes),
        jurisdiction: getRandomElement(["Federal", "California", "New York", "Texas", "Delaware"]),
        year: year,
        summary: `This statute governs ${getRandomElement(legalTopics)} and provides that...`,
        relevance: getRandomInt(70, 99),
        topics: shuffleArray(legalTopics).slice(0, getRandomInt(1, 3)),
        url: `https://example.com/statutes/${crypto.randomUUID()}`
      });
    }
  }
  
  return results;
}

// Fix for the build error in CaseDetails.tsx
export function createChartConfig(title: string, colors: string[]) {
  return {
    title,
    colors,
    tooltip: {
      shared: true,
      intersect: false,
    },
    grid: {
      show: false,
    },
    theme: {
      mode: 'light',
    },
  };
}
