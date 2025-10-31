import { z } from "zod";
// ** user registration schema
export const userRegistrationSchema = z.object({
  fullName: z
    .string({ message: "fullName is required!!" })
    .min(1, { message: "fullName is required!!" })
    .min(3, {
      message: "Full name must be at least 3 characters long. e.g: John Doe"
    })
    .max(50, { message: "Full name can be at most 50 characters long. e.g: John Doe" })
    .regex(/^[a-zA-Z ]{3,20}$/, {
      message: "Full name can only contain letters and spaces. e.g: John Doe"
    }),
  email: z
    .string({ message: "email is required!!" })
    .min(1, { message: "email is required!!" })
    .min(3, { message: "email must be at least 3 characters long." })
    .max(150, { message: "email can be at most 150 characters long." })
    .regex(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, {
      message: "Invalid email format. e.g: john.doe@example.com"
    }),
  password: z
    .string({ message: "password is required!!" })
    .min(1, { message: "password is required!!" })
    .min(6, { message: "password must be at least 6 characters long." })
    .max(50, { message: "password can be at most 50 characters long." })
});
export const vendorRegistrationSchema = z.object({
  fullName: z
    .string({ message: "fullName is required!!" })
    .min(1, { message: "fullName is required!!" })
    .min(3, {
      message: "Full name must be at least 3 characters long. e.g: John Doe"
    })
    .max(50, { message: "Full name can be at most 50 characters long. e.g: John Doe" })
    .regex(/^[a-zA-Z ]{3,20}$/, {
      message: "Full name can only contain letters and spaces. e.g: John Doe"
    })
    .optional(),
  email: z
    .string({ message: "email is required!!" })
    .min(1, { message: "email is required!!" })
    .min(3, { message: "email must be at least 3 characters long." })
    .max(150, { message: "email can be at most 150 characters long." })
    .regex(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, {
      message: "Invalid email format. e.g: john.doe@example.com"
    })
    .optional(),
  password: z.string({ message: "password must be string" }).optional(),
  businessName: z.string().max(100).optional(),
  businessType: z.string().max(50).optional(),
  businessLegalStructure: z.string().max(50).optional(),
  einNumber: z.string().max(20).optional(),
  tinNumber: z.string().max(20).optional(),
  contactPerson: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  bankName: z.string().max(100).optional(),
  accountNumber: z.string().max(30).optional(),
  routingNumber: z.string().max(30).optional(),
  bankAddress: z.string().max(200).optional(),
  signatoryName: z.string().max(100).optional(),
  signatureDate: z.string().optional(),
  vendoraccepted: z.boolean().optional(),
  isCompleted: z.boolean().optional()
});
//
export const vendorOrderSchema = z.object({
  status: z.enum(["PENDING", "DISPATCH", "COMPLETED", "FAILED", "CANCELLED"]).optional()
});

// ** user login schema
export const userLoginSchema = z.object({
  email: z
    .string({ message: "email is required!!" })
    .min(1, { message: "email is required!!" })
    .min(3, { message: "email must be at least 3 characters long." })
    .max(150, { message: "email can be at most 150 characters long." })
    .regex(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, {
      message: "Invalid email format. e.g: john.doe@example.com"
    }),
  password: z
    .string({ message: "password is required!!" })
    .min(1, { message: "password is required!!" })
    .max(100, { message: "password can be at most 100 characters long." })
});

// ** Google login
export const verifyGoogleLoginSchema = z.object({
  email: z
    .string({ message: "Email is required!!" })
    .min(1, { message: "Email is required!!" })
    .email({ message: "Invalid email format. e.g: john.doe@example.com" }),
  fullName: z.string({ message: "fullName is required!!" }).min(1, { message: "fullName is required!!" })
});

// ** verify resend schema
export const verifyUserSchema = z.object({
  email: z
    .string({ message: "Email is required!!" })
    .min(1, { message: "Email is required!!" })
    .email({ message: "Invalid email format. e.g: john.doe@example.com" })
});

export const verifyOTPSchema = z.object({
  email: z
    .string({ message: "Email is required!!" })
    .min(1, { message: "Email is required!!" })
    .email({ message: "Invalid email format. e.g: john.doe@example.com" }),
  OTP: z.string({ message: "OTP is required" })
});

export const membershipSchema = z.object({
  phone: z.string({ message: "Phone number is required" }).min(5, { message: "Phone number must be at least 5 characters" }),

  country: z.string({ message: "Country is required" }),

  agreedToPrinciples: z.boolean({
    message: "You must agree to the principles"
  }),

  // Array validation for roles
  role: z
    .array(
      z.enum(["volunteer", "donor", "collaborator"], {
        message: "Invalid role type"
      })
    )
    .nonempty({
      message: "At least one role is required"
    }),

  collaboratorIntent: z.array(z.enum(["institutional", "cultural", "interfaithDialogue", "programCorrelation"])).optional(),

  donorType: z.array(z.enum(["onetime", "monthly", "sponsor", "tools", "remainAnonymous", "receiveUpdates"])).optional(),

  volunteerSupport: z.array(z.enum(["spiritualProgram", "communityOutreach", "culturalPreservation", "digitalMedia", "craftsmanship"])).optional(),

  // Other fields
  consentedToUpdates: z.boolean().optional().default(false),
  additionalInfo: z.string().optional(),
  intentCreation: z.string().optional(),
  monthlyTime: z.string().optional(),
  organization: z.string().optional(),
  previousVolunteerExp: z.string().optional(),
  volunteerMode: z.enum(["IN_PERSON", "HYBRID", "REMOTE"]).optional()
});
export const membershipUpdateSchema = z.object({
  phone: z
    .string()
    .optional()
    .refine((val) => val === undefined || val.trim().length >= 5, {
      message: "Phone number must be at least 5 characters if provided"
    }),

  country: z
    .string()
    .optional()
    .refine((val) => val === undefined || val.trim() !== "", {
      message: "Country cannot be empty if provided"
    }),

  agreedToPrinciples: z.boolean().optional(),

  role: z
    .array(
      z.enum(["volunteer", "donor", "collaborator"], {
        message: "Invalid role type"
      })
    )
    .optional()
    .refine((val) => val === undefined || val.length > 0, {
      message: "At least one role is required if provided"
    }),

  collaboratorIntent: z
    .array(z.enum(["institutional", "cultural", "interfaithDialogue", "programCorrelation"]))
    .optional()
    .refine((val) => val === undefined || val.length > 0, {
      message: "Collaborator intent cannot be empty if provided"
    }),

  donorType: z
    .array(z.enum(["onetime", "monthly", "sponsor", "tools", "remainAnonymous", "receiveUpdates"]))
    .optional()
    .refine((val) => val === undefined || val.length > 0, {
      message: "Donor type cannot be empty if provided"
    }),

  volunteerSupport: z
    .array(z.enum(["spiritualProgram", "communityOutreach", "culturalPreservation", "digitalMedia", "craftsmanship"]))
    .optional()
    .refine((val) => val === undefined || val.length > 0, {
      message: "Volunteer support cannot be empty if provided"
    }),

  consentedToUpdates: z.boolean().optional(),

  additionalInfo: z
    .string()
    .optional()
    .refine((val) => val === undefined || val.trim() !== "", {
      message: "Additional info cannot be empty if provided"
    }),

  intentCreation: z
    .string()
    .optional()
    .refine((val) => val === undefined || val.trim() !== "", {
      message: "Intent creation cannot be empty if provided"
    }),

  monthlyTime: z
    .string()
    .optional()
    .refine((val) => val === undefined || val.trim() !== "", {
      message: "Monthly time cannot be empty if provided"
    }),

  organization: z
    .string()
    .optional()
    .refine((val) => val === undefined || val.trim() !== "", {
      message: "Organization cannot be empty if provided"
    }),

  previousVolunteerExp: z
    .string()
    .optional()
    .refine((val) => val === undefined || val.trim() !== "", {
      message: "Previous volunteer experience cannot be empty if provided"
    }),

  volunteerMode: z.enum(["IN_PERSON", "HYBRID", "REMOTE"]).optional()
});

export const donationSchema = z.object({
  // Array validation for roles
  amount: z.string({
    message: "Must provide valid amount"
  }),
  type: z.string({
    message: "Must provide Donation Type"
  }),
  pool: z.array(z.string({ message: "Must provide valid pool type" }))
});

export const donationSchemaU = z.object({
  amount: z
    .string()
    .optional()
    .refine((val) => val === undefined || val.trim() !== "", {
      message: "Amount cannot be empty if provided"
    }),
  type: z
    .string()
    .optional()
    .refine((val) => val === undefined || val.trim() !== "", {
      message: "Donation Type cannot be empty if provided"
    }),
  pool: z
    .array(z.string().min(1, "Pool items must not be empty"))
    .optional()
    .refine((val) => val === undefined || val.length > 0, {
      message: "Pool cannot be an empty array if provided"
    })
});
export const productSchema = z.object({
  title: z.string({ message: "Title must be a string" }),
  description: z.string({ message: "Description is required" }),
  price: z.string({ message: "Price is required" }).refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Price must be a valid amount"
  }),
  stock: z.string({ message: "Stock is required" }).refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Stock must be a valid number"
  }),
  tags: z.array(z.string()).optional(),
  sku: z.string({
    message: "SKU is required"
  }),
  discount: z.string().optional(),
  deliveryTime: z.string().optional(),
  note: z.string().optional(),
  isAvailable: z.boolean().optional(),
  returnPolicy: z.string().optional(),
  isDelete: z.string().optional()
});

export const couponSchema = z.object({
  code: z.string({ message: "Code must be a string" }),
  discount: z.string({ message: "Discount is required" }),
  expiresAt: z.string({ message: "Expiration must be valid date string" }).optional()
});

// For Digital Book
export const bookSchema = z.object({
  title: z.string({ message: "Title must be a string" }),
  description: z.string({ message: "Description is required" }),
  price: z.string({ message: "Price is required" }).refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Price must be a valid amount"
  }),
  stock: z
    .string({ message: "Stock is required" })
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Stock must be a valid number"
    })
    .optional(),
  author: z.string({ message: "Author must be string" }),
  genre: z.string({ message: "Genre must be string" }).optional(),
  releaseDate: z.string({ message: "Release date must be string" }).optional(),
  url: z.string().optional(),
  overviewImages: z.string().optional(),
  fileType: z.string().optional(),
  coverImage: z.string().optional(),
  isAvailable: z.string().optional()
});
// For Audio
export const audioSchema = z.object({
  title: z.string({ message: "Title must be a string" }),
  description: z.string({ message: "Description is required" }),
  price: z.string({ message: "Price is required" }).refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Price must be a valid amount"
  }),
  stock: z.string({ message: "Stock is required" }).refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Stock must be a valid number"
  }),
  artist: z.string({ message: "Artist name must be string" }).optional(),
  mp3Url: z.string().url().optional(),
  mp4Url: z.string().url().optional(),
  duration: z
    .string()
    .refine((val) => !val || !isNaN(Number(val)), {
      message: "Duration must be a valid number (in seconds)"
    })
    .optional(),
  isAvailable: z.boolean().optional()
});

export const reviewSchema = z.object({
  category: z.enum(["fashion", "decoration", "meditation", "accessories", "digital-books", "living", "audio"], {
    required_error: "Category is required",
    invalid_type_error: "Invalid category"
  }),
  productId: z.number({ message: "Product id is required" }),
  rating: z
    .number({
      message: "Rating must be a number"
    })
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5"),
  content: z.string({ message: "Review content is required" }).min(10, "Review content must be at least 10 characters")
});
export const cartSchema = z.object({
  productId: z.number({ message: "Product Id is required" }),
  category: z.enum(["music", "book", "fashion", "meditation", "decoration", "living", "accessories"], {
    required_error: "Category is required",
    invalid_type_error: "Invalid category"
  }),
  qty: z.number().min(1, { message: "Quantity must be at least 1" }).optional() // optional, defaults to 1 in DB
});
export const wishlistSchema = z.object({
  productId: z.number({ message: "Product Id is required" })
});
export const userUpdateSchema = z.object({
  fullName: z.string({ message: "FullName is required!!" }).optional(),
  address: z
    .string({
      message: "Must be valid address"
    })
    .optional(),
  phone: z
    .string({
      message: "Must be valid phone"
    })
    .optional(),
  city: z
    .string({
      message: "Must be valid city"
    })
    .optional(),
  state: z
    .string({
      message: "Must be valid state"
    })
    .optional(),
  zipCode: z
    .string({
      message: "Must be valid zipCode"
    })
    .optional(),
  country: z
    .string({
      message: "Must be valid country"
    })
    .optional()
});

export const bookServiceSchema = z.object({
  subject: z.string({ message: "Subject must be string" }).min(2, { message: "Subject must be atleast 2 characters long" }),
  date: z.string({ message: "Date is required" }).min(2, { message: "Date must be valid" }), //z.preprocess((val) => (typeof val === "string" || val instanceof Date ? new Date(val) : val), z.date({ message: "Date should be valid" })),
  comment: z.string().optional(),
  service: z.enum(
    [
      "ASSIST_WITH_SPRITUAL_PROGRAM",
      "SUPPORT_CRAFT_CULTURE",
      "FUND_RAISING_EVENT_ORGANIZATION",
      "OUTREACH_COMMUNITY",
      "HELP_DIGITAL_MEDIA",
      "CREATE_SACRED_ART_HANDICRAFTS"
    ],
    {
      required_error: "Service is required"
    }
  )
});

export const bookInterviewSchema = z.object({
  profession: z.string({ message: "Profession must be string" }).min(3, { message: "Profession must be atleast 3 characters long" }).optional(),
  institution: z.string({ message: "Institution is required" }).min(3, { message: "Institution must be atleast 3 characters long" }).optional(),
  website: z.string({ message: "Website url must be a valid string" }).min(3, { message: "Website url must be valid " }).optional(),
  areasOfImpact: z
    .array(
      z.enum(
        [
          "SPRITUAL_LEADERSHIP",
          "INTEGRATIVE_HEALTH",
          "SCIENTIFIC_CONCIOUSNESS",
          "ECO_STEWARD",
          "POLICY_REFORM",
          "TRANS_EDUCATIVE",
          "ETHICAL_JUSTICE",
          "CULTURAL_EXPRESSION",
          "UNITY_DIALOGUE",
          "YOUTH_EMPOWERMENT"
        ],
        { message: "Must be valid impact type" }
      )
    )
    .optional(),
  spiritualOrientation: z.enum(["SUFI", "FREE_THINKER", "NOT_AFFLIATED"], { message: "Spritual orientation must be valid type" }).optional(),
  publicVoice: z.boolean({ message: "Must be bool value" }).optional(),
  interviewIntent: z
    .array(
      z.enum(["INSPIRING_OTHERS", "SHARE_KNOWLEDGE", "NETWORK", "PROMOTE_WORK", "DOCUMENT_EXPERIENCE", "SPIRITUAL_DIALOGUE"], {
        message: "Interview intent must be valid type"
      })
    )
    .optional(),
  interviewTimeZone: z.enum(["MYSTIC", "SCIENTIFIC", "ACADEMIC"], { message: "Interview time zone must be string" }).optional(),
  scheduledAt: z.string({ message: "Time must be required " }),
  additionalNotes: z.string({ message: "Additional notes must be string" }).optional()
});

export const conferenceRegistration = z.object({
  institution: z
    .string({ message: "Institution must be string" })
    .min(1, { message: "Institution is required!!" })
    .min(3, { message: "Institution must be at least 3 characters long." })
    .max(500, { message: "Institution can be at most 500 characters long." })
    .optional(),
  abstract: z
    .string({ message: "Abstract is required!!" })
    .min(1, { message: "Abstract is required!!" })
    .min(3, { message: "Abstract must be at least 3 characters long." })
    .max(500, { message: "Abstract can be at most 500 characters long." }),
  presentationType: z.enum(["ORAL", "POSTER", "WORKSHOP", "PANEL_DICUSSION"], { message: "Must be valid presentation type" }),
  topic: z.enum(["SUFI_PHILOSOPHY", "QUANTUM_CONSCIOUSNESS", "MYSTICAL_PRACTICES", "HEALING_TRANSITIONS", "INTER_APPROACHES", "OTHER"], {
    message: "Must be valid topic type"
  })
});
export const sufiChecklistSchema = z.object({
  progress: z
    .number({ message: "Progress must be a number" })
    .int({ message: "Progress must be an integer" })
    .min(0, { message: "Invalid Progress value" })
    .max(100, { message: "Invalid Progress value" }),
  items: z.array(
    z.object({
      section: z.enum(["INITIAL_ORIENTATION", "FINDING_GUIDANCE", "PRACTICE_AND_DISCIPLINE", "COMMUNITY_ENGAGEMENT", "ADVANCED_STUDY"]),
      title: z.string(),
      status: z.enum(["PENDING", "COMPLETED", "SKIPPED"])
    })
  )
});
export const updateConferenceStatusSchema = z.object({
  status: z
    .number({ message: "Status must be a number" })
    .int({ message: "Status must be an integer" })
    .min(0, { message: "Invalid status value" })
    .max(2, { message: "Invalid status value" })
});

export const contactUsSchema = z.object({
  subject: z
    .string({ message: "Subject is required" })
    .min(1, { message: "Subject is required!!" })
    .min(3, { message: "Subject must be at least 3 characters long." })
    .max(500, { message: "Subject can be at most 500 characters long." }),
  message: z
    .string({ message: "Message is required!!" })
    .min(1, { message: "Message is required!!" })
    .min(3, { message: "Message must be at least 3 characters long." })
    .max(500, { message: "message can be at most 500 characters long." })
});

export const userUpdateEmailSchema = z.object({
  id: z.string({ message: "id is required!!" }).min(1, { message: "id is required!!" }),
  email: z
    .string({ message: "Email is required!!" })
    .min(1, { message: "Email is required!!" })
    .min(3, { message: "Email must be at least 3 characters long." })
    .max(150, { message: "Email can be at most 150 characters long." })
    .email({ message: "Invalid email format. e.g: john.doe@example.com" })
    .regex(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, {
      message: "Invalid email format. e.g: john.doe@example.com"
    })
});

export const userUpdatePasswordSchema = z.object({
  id: z.string({ message: "id is required!!" }).min(1, { message: "id is required!!" }),
  oldPassword: z
    .string({ message: "OldPassword  is required" })
    .min(1, { message: "OldPassword  is required" })
    .max(50, { message: "OldPassword  can be at most 50 characters long." }),
  newPassword: z
    .string({ message: "NewPassword is required!!" })
    .min(1, { message: "NewPassword is required!!" })
    .min(6, { message: " NewPassword must be at least 6 characters long." })
    .max(50, { message: " NewPassword can be at most 50 characters long." })
});
export const userDeleteSchema = z.object({
  username: z.string({ message: "Id is required!!" }).min(1, { message: "Id is required!!" })
});

export const getSingleUserSChema = z.object({
  username: z
    .string({ message: "Username is required!!" })
    .min(1, { message: "Username is required!!" })
    .min(3, {
      message: "Username must be at least 3 characters long. e.g: user123"
    })
    .max(50, { message: "Username can be at most 50 characters long. e.g: user123" })
    .regex(/^[a-z0-9_.]{1,20}$/, {
      message: "Username can only contain lowercase letters, numbers, underscores, and periods. e.g: user123"
    })
});
/*   Contact US Schema                                                               */

export const sendMessagaeToUserSchema = z.object({
  id: z.number({ message: "id is required!!" }).min(1, { message: "id is required!!" }),
  message: z.string({ message: "message is required!!" }).min(1, { message: "message is required!!" })
});

// **** forgot password schema
export const forgotPasswordRequestFromUserSchema = z.object({
  email: z
    .string({ message: "email is required!!" })
    .min(1, { message: "email is required!!" })
    .min(3, { message: "email must be at least 3 characters long." })
    .max(150, { message: "email can be at most 150 characters long." })
    .email({ message: "Invalid email format. e.g: john.doe@example.com" })
    .regex(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, {
      message: "Invalid email format. e.g: john.doe@example.com"
    })
});
// export const verifyForgotPasswordRequestSchema = z.object({
//   OTP: z
//     .string({ message: "OTP is required!!" })
//     .min(1, { message: "OTP is required!!" })
//     .min(6, { message: "OTP must be at least 6 characters long." })
//     .max(6, { message: "OTP can be at most 6 characters long." })
// });
export const updateForgotPasswordSchema = z.object({
  email: z
    .string({ message: "email is required!!" })
    .min(1, { message: "email is required!!" })
    .min(3, { message: "email must be at least 3 characters long." })
    .max(150, { message: "email can be at most 150 characters long." })
    .email({ message: "Invalid email format. e.g: john.doe@example.com" })
    .regex(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, {
      message: "Invalid email format. e.g: john.doe@example.com"
    }),
  newPassword: z
    .string({ message: "newPassword is required!!" })
    .min(1, { message: "newPassword is required!!" })
    .min(6, { message: "newPassword must be at least 6 characters long." })
    .max(50, { message: "newPassword can be at most 50 characters long." })
});

// ** Blog post schema

export const blogPostSchema = z.object({
  blogTitle: z
    .string({ message: "blogTitle is required!!" })
    .min(1, { message: "blogTitle is required!!" })
    .min(3, { message: "blogTitle must be at least 3 characters long." })
    .max(450, { message: "blogTitle can be at most 450 characters long." }),
  blogThumbnail: z
    .string({ message: "blogThumbnail is required!!" })
    .min(1, { message: "blogThumbnail is required!!" })
    .min(3, { message: "blogThumbnail must be at least 3 characters long." })
    .max(450, { message: "blogThumbnail can be at most 450 characters long." }),
  blogOverview: z
    .string({ message: "blogOverview is required!!" })
    .min(1, { message: "blogOverview is required!!" })
    .min(3, { message: "blogOverview must be at least 3 characters long." })
    .max(650, { message: "blogOverview can be at most 450 characters long." }),
  blogBody: z
    .string({ message: "blogBody is required!!" })
    .min(1, { message: "blogBody is required!!" })
    .min(3, { message: "blogBody must be at least 3 characters long." })
});
export const verifyBillingDetails = z.object({
  email: z
    .string({ message: "Email is required!!" })
    .min(1, { message: "Email is required!!" })
    .email({ message: "Invalid email format. e.g: john.doe@example.com" }),
  fullName: z.string({ message: "fullName is required!!" }).min(1, { message: "fullName is required!!" }),
  address: z.string({ message: "Must be valid address" }),
  zip: z.string({ message: "Must be valid Zip" }),
  country: z.string({ message: "Must be valid Country" }).optional(),
  phone: z.string({ message: "Must be valid Phone Number" }).optional()
});
export const verifyOrderDetails = z.object({
  email: z
    .string({ message: "Email is required!!" })
    .min(1, { message: "Email is required!!" })
    .email({ message: "Invalid email format. e.g: john.doe@example.com" }),
  fullName: z.string({ message: "fullName is required!!" }).min(1, { message: "fullName is required!!" }),
  shippingAddress: z.string({ message: "Must be valid address" }),
  zip: z.string({ message: "Must be valid Zip" }),
  country: z.string({ message: "Must be valid Country" }).optional(),
  phone: z.string({ message: "Must be valid Phone Number" }).optional()
});

// Vendor company profile schema
export const vendorCompanyProfileSchema = z.object({
  businessName: z
    .string({ message: "Business name must be a string" })
    .min(1, { message: "Business name is required" })
    .max(100, { message: "Business name cannot exceed 100 characters" })
    .optional(),
  email: z
    .string({ message: "Email must be a string" })
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid email format. e.g: john.doe@example.com" })
    .max(150, { message: "Email cannot exceed 150 characters" })
    .optional(),
  address: z
    .string({ message: "Address must be a string" })
    .min(1, { message: "Address is required" })
    .max(200, { message: "Address cannot exceed 200 characters" })
    .optional(),
  zipCode: z
    .string({ message: "Zip code must be a string" })
    .min(1, { message: "Zip code is required" })
    .max(20, { message: "Zip code cannot exceed 20 characters" })
    .regex(/^[0-9-]+$/, { message: "Zip code can only contain numbers and hyphens" })
    .optional(),
  city: z
    .string({ message: "City must be a string" })
    .min(1, { message: "City is required" })
    .max(50, { message: "City cannot exceed 50 characters" })
    .regex(/^[a-zA-Z\s]+$/, { message: "City can only contain letters and spaces" })
    .optional(),
  state: z
    .string({ message: "State must be a string" })
    .min(1, { message: "State is required" })
    .max(50, { message: "State cannot exceed 50 characters" })
    .regex(/^[a-zA-Z\s]+$/, { message: "State can only contain letters and spaces" })
    .optional(),
  country: z
    .string({ message: "Country must be a string" })
    .min(1, { message: "Country is required" })
    .max(50, { message: "Country cannot exceed 50 characters" })
    .regex(/^[a-zA-Z\s]+$/, { message: "Country can only contain letters and spaces" })
    .optional(),
  phone: z
    .string({ message: "Phone must be a string" })
    .min(1, { message: "Phone is required" })
    .max(20, { message: "Phone cannot exceed 20 characters" })
    .regex(/^[0-9+\-\s()]+$/, { message: "Phone can only contain numbers, spaces, hyphens, parentheses, and plus sign" })
    .optional(),
  businessType: z.string({ message: "Business type must be a string" }).max(50, { message: "Business type cannot exceed 50 characters" }).optional(),
  businessLegalStructure: z
    .string({ message: "Business legal structure must be a string" })
    .max(50, { message: "Business legal structure cannot exceed 50 characters" })
    .optional(),
  contactPerson: z
    .string({ message: "Contact person must be a string" })
    .max(100, { message: "Contact person cannot exceed 100 characters" })
    .regex(/^[a-zA-Z\s]+$/, { message: "Contact person can only contain letters and spaces" })
    .optional()
});
