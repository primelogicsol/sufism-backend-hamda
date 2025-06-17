import type {
  ChecklistItemStatus,
  ChecklistSection,
  CONFERENCE_TYPE,
  DONATION_TYPE,
  IMPACT_TYPE,
  INTERVIEW_INTENT_TYPE,
  INTERVIEW_TIME_ZONE,
  PRESENTATION_TYPE,
  SERVICE_TYPE,
  SPRITUAL_TYPE,
  STATUS_TYPE,
  VolunteeringMode
} from "@prisma/client";

export type THTTPRESPONSE = {
  success: boolean;
  status: number;
  message: string;
  data: unknown;
  requestInfo?: {
    ip?: string;
    url: string | null;
    method: string | null;
  };
};

// ** Interface
export interface IHTTPRESPONSE {
  success: boolean;
  status: number;
  message: string;
  data: unknown;
  requestInfo: {
    ip?: string;
    url: string | null;
    method: string | null;
  };
}
export interface IREGISTER {
  username: string;
  fullName: string;
  email: string;
  password: string;
}

export interface ICOOKIEOPTIONS {
  httpOnly: true;
  secure: boolean;
  sameSite: "none";
  expires: Date;
}

export interface IPAGINATION {
  currentPage: number;
  pageSize: number;
  totalPage: number;
  totalRecord: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export type TMEMBERSHIPROLE = "volunteer" | "donor" | "collaborator";
export type TDONORPREFERENCES = "onetime" | "monthly" | "sponsor" | "tools" | "remainAnonymous" | "receiveUpdates";
export type TCOLABORATORINTENT = "institutional" | "cultural" | "interfaithDialogue" | "programCorrelation";
export type TSUPPORTAREA = "spiritualProgram" | "communityOutreach" | "culturalPreservation" | "digitalMedia" | "craftsmanship";

export interface TMEMBERSHIP {
  phone: string;
  country: string;
  agreedToPrinciples: boolean;
  consentedToUpdates: boolean;
  additionalInfo?: string;
  collaboratorIntent?: TCOLABORATORINTENT[];
  donorType?: TDONORPREFERENCES[];
  intentCreation?: string;
  monthlyTime?: string;
  organization?: string;
  previousVolunteerExp?: string;
  role: TMEMBERSHIPROLE[];
  volunteerMode?: VolunteeringMode;
  volunteerSupport?: TSUPPORTAREA[];
}
export type TPOOL = "SUFI_SCIENCE_CENTER" | "SPONSOR_SCHOLAR" | "PRESERVE_ART_AND_CRAFT" | "SPONSOR_EVENTS";

export interface TDONORSHIP {
  amount: string;
  type: DONATION_TYPE;
  pool: TPOOL[];
}
export type TPRODUCT_TYPE = "physicalGoods" | "digitalBook" | "audioSpectrum";
export interface TPRODUCT {
  // type: PRODUCT_TYPE,
  type: TPRODUCT_TYPE;
  sku: string;
}
export interface TREVIEW {
  rating: number;
  review: string;
  productId: number;
  statu: STATUS_TYPE;
}
export interface TCART {
  productId: number;
  qty: number;
}
export interface TWishlist {
  productId: number;
}
export interface TPRODUCT_SEARCH {
  page?: string;
  limit?: string;
  search?: string;
  type?: string;
  sortBy?: string;
  sortOrder?: string;
}
export interface TBOOK_SERVICE {
  service: SERVICE_TYPE;
  subject: string;
  date: string;
  comment?: string;
}
export interface TPROFILE {
  fullName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
}
export interface TINTERVIEW {
  fullName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
}

// Interface for creating an interview
export interface TCREATE_INTERVIEW_REQUEST {
  profession: string;
  institution: string;
  website?: string;
  areasOfImpact?: IMPACT_TYPE[];
  spiritualOrientation?: SPRITUAL_TYPE;
  publicVoice: boolean;
  interviewIntent?: INTERVIEW_INTENT_TYPE[];
  interviewTimeZone?: INTERVIEW_TIME_ZONE;
  scheduledAt: string | Date; // ISO string or Date object
  additionalNotes?: string;
}

export interface TCREATE_CONFERENCE_REGISTRATION {
  institution: string;
  abstract: string;
  presentationType: PRESENTATION_TYPE;
  topic: CONFERENCE_TYPE;
}

export interface TCONTACT_US {
  message: string;
  subject: string;
}
export interface TCONFERENCE_UPDATE {
  status: number;
}

export type TCreateSufiChecklistRequest = {
  status: string;
  progress: number;
  completeAll?: boolean; // <-- Optional flag
  resetAll?: boolean;

  items: {
    section: ChecklistSection;
    title: string;
    status?: ChecklistItemStatus;
  }[];
};

export interface T_ITEM {
  title: string;
  description?: string;
  price: number;
  tags?: string[];
  sku: string;
  stock?: number;
}

export interface SearchQuery {
  page?: string;
  limit?: string;
  search?: string;
  sortBy?: string;
  artist?: string;
  sortOrder?: "asc" | "desc";
}

export interface ReviewData {
  rating: number;
  content: string;
}
