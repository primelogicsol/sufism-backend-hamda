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

export const productSchema = z.object({
  // images: z.string()
  //   .refine((val) => val.length > 0, { message: "Image is required" }),
  title: z.string({
    message: "Title must be string"
  }),
  description: z.string({
    message: "Description is required"
  }),
  price: z.string({
    message: "Price is required"
  }),
  discount: z.string().optional(),
  stock: z.string({
    message: "Stock is required"
  }),
  deliveryTime: z.string().optional(),
  note: z.string().optional(),
  returnPolicy: z.string().optional(), // "30-day return for unused items"
  category: z.enum(
    ["JWELERY_ACCESSPORIES", "ART_WALL_CONTROL", "HOME_WALLDECOR", "FASION_UPRAISEL", "WELLNESS_MEDITAION", "DIGITAL_BOOKS", "AUDIO_SPECTRUM"],
    {
      message: "Category is required"
    }
  ),
  tags: z.array(z.string()).optional(),
  sku: z.string({ message: "SKU is required" }),
  isAvailable: z.boolean().optional()
});
export const reviewSchema = z.object({
  review: z.string({
    message: "Review must be string"
  }),
  productId: z.number({ message: "Product id is required" }),
  rating: z
    .number({
      message: "Rating must be a number"
    })
    .min(0, "Rating cannot be negative")
    .max(5, "Rating cannot exceed 100")
    .optional()
});
export const cartSchema = z.object({
  productId: z.number({ message: "Product Id is required" }),
  qty: z.number().min(1, { message: "Quantity must be at least 1" }).optional() // optional, defaults to 1 in DB
});
export const wishlistSchema = z.object({
  productId: z.number({ message: "Product Id is required" })
});
export const userUpdateSchema = z.object({
  id: z.string({ message: "id is required!!" }).min(1, { message: "id is required!!" }),
  fullName: z
    .string({ message: "FullName is required!!" })
    .min(1, { message: "FullName is required!!" })
    .min(3, {
      message: "Full name must be at least 3 characters long. e.g: John Doe"
    })
    .max(50, { message: "Full name can be at most 50 characters long. e.g: John Doe" })
    .regex(/^[a-zA-Z ]{3,20}$/, {
      message: "Full name can only contain letters and spaces. e.g: John Doe"
    })
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
