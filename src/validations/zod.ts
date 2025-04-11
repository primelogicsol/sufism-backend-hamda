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

// ** verify user schema
export const verifyUserSchema = z.object({
  email: z
    .string({ message: "Email is required!!" })
    .min(1, { message: "Email is required!!" })
    .email({ message: "Invalid email format. e.g: john.doe@example.com" })
  // OTP: z
  //   .string({ message: "OTP is required!!" })
  //   .min(1, { message: "OTP is required!!" })
  //   .min(6, { message: "OTP must be at least 6 characters long." })
  //   .max(6, { message: "OTP can be at most 6 characters long." })
});

export const sendOTPSchema = z.object({
  email: z
    .string({ message: "Email is required!!" })
    .min(1, { message: "Email is required!!" })
    .email({ message: "Invalid email format. e.g: john.doe@example.com" })
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
/*                                                       Contact US Schema                                                               */

export const contactUsSchema = z.object({
  firstName: z
    .string({ message: "FirstName is required!!" })
    .min(1, { message: "FirstName is required!!" })
    .min(2, { message: "FirstName must be at least 2 characters long." })
    .max(50, { message: "FirstName can be at most 50 characters long." }),

  lastName: z
    .string({ message: "LastName is required!!" })
    .min(1, { message: "LastName is required!!" })
    .min(3, { message: "LastName must be at least 3 characters long." })
    .max(50, { message: "LastName can be at most 50 characters long." }),
  email: z
    .string({ message: "Email is required!!" })
    .min(1, { message: "Email is required!!" })
    .min(3, { message: "Email must be at least 3 characters long." })
    .max(150, { message: "mEail can be at most 150 characters long." })
    .email({ message: "Invalid email format. e.g: john.doe@example.com" }),
  message: z
    .string({ message: "Message is required!!" })
    .min(1, { message: "Message is required!!" })
    .min(3, { message: "Message must be at least 3 characters long." })
    .max(500, { message: "message can be at most 500 characters long." })
});

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
export const verifyForgotPasswordRequestSchema = z.object({
  OTP: z
    .string({ message: "OTP is required!!" })
    .min(1, { message: "OTP is required!!" })
    .min(6, { message: "OTP must be at least 6 characters long." })
    .max(6, { message: "OTP can be at most 6 characters long." })
});
export const updateForgotPasswordSchema = z.object({
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
