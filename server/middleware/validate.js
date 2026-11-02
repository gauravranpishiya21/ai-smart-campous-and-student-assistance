// Request Validation Middleware using Zod
// Provides schema definitions and validation enforcement for POST/PUT endpoints.
const { z } = require('zod');

/**
 * Creates an Express middleware to validate request data against a Zod schema.
 * @param {z.ZodSchema} schema
 * @param {'body'|'query'|'params'} source
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source] ?? {};
      const parsed = schema.parse(dataToValidate);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const issues = err.issues || err.errors || [];
        const formatted = issues.map((i) => `${i.path.join('.') || 'root'}: ${i.message}`).join(', ') || 'Validation failed';
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: formatted,
            details: issues
          },
          message: formatted
        });
      }
      next(err);
    }
  };
}

// ----------------------------------------------------
// Schemas for Authentication & User Registration
// ----------------------------------------------------
const loginSchema = z.object({
  id: z.string({ required_error: 'ID/Roll Number/Email is required' }).min(1, 'ID cannot be empty'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password cannot be empty')
}).passthrough();

const registerSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).min(1, 'Name cannot be empty'),
  roll_no: z.string({ required_error: 'Roll number is required' }).min(1, 'Roll number cannot be empty'),
  email: z.string({ required_error: 'Email is required' }).min(1, 'Email cannot be empty'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password cannot be empty'),
  dept: z.string().optional(),
  year: z.union([z.number(), z.string()]).optional(),
  semester: z.union([z.number(), z.string()]).optional(),
  role: z.string().optional()
}).passthrough();

// ----------------------------------------------------
// Schemas for Core Student & Academic POST/PUT Routes
// ----------------------------------------------------
const genericPostSchema = z.object({}).passthrough();

const attendanceMarkSchema = z.object({
  status: z.string().optional(),
  method: z.string().optional()
}).passthrough();

const leaveSchema = z.object({
  from: z.string().min(1, 'Leave start date is required'),
  to: z.string().min(1, 'Leave end date is required'),
  reason: z.string().min(1, 'Reason is required')
}).passthrough();

const feePaySchema = z.object({
  amount: z.union([z.number(), z.string()]).optional()
}).passthrough();

const scholarshipApplySchema = z.object({
  name: z.string().optional(),
  amount: z.union([z.number(), z.string()]).optional()
}).passthrough();

const counselingSchema = z.object({
  date: z.string().optional(),
  time: z.string().optional(),
  notes: z.string().optional()
}).passthrough();

const wellnessSchema = z.object({
  mood: z.union([z.number(), z.string()]).optional(),
  notes: z.string().optional()
}).passthrough();

const chatMessageSchema = z.object({
  text: z.string().optional(),
  message: z.string().optional()
}).passthrough();

const socialPostSchema = z.object({
  content: z.string().optional(),
  text: z.string().optional()
}).passthrough();

const forumTopicSchema = z.object({
  title: z.string().min(1, 'Topic title is required'),
  body: z.string().optional(),
  content: z.string().optional(),
  tags: z.any().optional()
}).passthrough();

const forumReplySchema = z.object({
  text: z.string().optional(),
  body: z.string().optional(),
  content: z.string().optional()
}).passthrough();

const aiEngineSchema = z.object({
  action_intent: z.string().optional(),
  intent: z.string().optional(),
  user_id: z.any().optional(),
  role: z.any().optional(),
  prompt: z.string().optional()
}).passthrough();

const aiKernelExecuteSchema = z.object({
  target_function: z.string().optional(),
  parameters: z.any().optional()
}).passthrough();

const aiChatSchema = z.object({
  message: z.string().optional(),
  history: z.array(z.any()).optional()
}).passthrough();

const aiDoubtSchema = z.object({
  dept: z.string().optional(),
  question: z.string().optional()
}).passthrough();

const ragQuerySchema = z.object({
  query: z.string().min(1, 'Query is required'),
  history: z.array(z.any()).optional()
}).passthrough();

const personalQuerySchema = z.object({
  query: z.string().min(1, 'Query is required')
}).passthrough();

const quizFlashcardsSchema = z.object({
  subject: z.string().optional(),
  topic: z.string().optional(),
  count: z.union([z.number(), z.string()]).optional()
}).passthrough();

const ticketTriageSchema = z.object({
  text: z.string().min(1, 'Description is required'),
  category: z.string().optional()
}).passthrough();

const assignmentGradeSchema = z.object({
  submission: z.string().min(1, 'Submission is required'),
  rubric: z.string().optional(),
  maxScore: z.union([z.number(), z.string()]).optional()
}).passthrough();

const plannerTaskSchema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  subject: z.string().optional(),
  priority: z.string().optional()
}).passthrough();

const complaintsSchema = z.object({
  category: z.string().optional(),
  detail: z.string().optional(),
  description: z.string().optional()
}).passthrough();

const maintenanceSchema = z.object({
  location: z.string().optional(),
  issue: z.string().optional()
}).passthrough();

const helpdeskSchema = z.object({
  subject: z.string().optional(),
  detail: z.string().optional()
}).passthrough();

const walletTopupSchema = z.object({
  amount: z.union([z.number(), z.string()]).optional()
}).passthrough();

const cafeteriaOrderSchema = z.object({
  items: z.array(z.any()).optional()
}).passthrough();

const profileUpdateSchema = z.object({
  phone: z.string().optional(),
  bio: z.string().optional(),
  name: z.string().optional(),
  semester: z.union([z.number(), z.string()]).optional(),
  year: z.union([z.number(), z.string()]).optional()
}).passthrough();

const parkingVehicleSchema = z.object({
  plate_number: z.string().optional(),
  reg_number: z.string().optional(),
  vehicle_type: z.string().optional(),
  model: z.string().optional()
}).passthrough();

// ----------------------------------------------------
// Schemas for Admin Routes
// ----------------------------------------------------
const adminStudentSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  roll_no: z.string().optional(),
  role: z.string().optional(),
  dept: z.string().optional(),
  year: z.union([z.number(), z.string()]).optional(),
  semester: z.union([z.number(), z.string()]).optional()
}).passthrough();

const adminAttendanceOverrideSchema = z.object({
  userId: z.union([z.number(), z.string()]).optional(),
  subjectId: z.union([z.number(), z.string()]).optional(),
  attended: z.union([z.number(), z.string()]).optional(),
  total: z.union([z.number(), z.string()]).optional()
}).passthrough();

const adminMarksUpdateSchema = z.object({
  userId: z.union([z.number(), z.string()]).optional(),
  subjectId: z.union([z.number(), z.string()]).optional(),
  internal: z.union([z.number(), z.string()]).optional(),
  endsem: z.union([z.number(), z.string()]).optional()
}).passthrough();

const adminNoticeSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  summary: z.string().optional(),
  category: z.string().optional(),
  priority: z.string().optional()
}).passthrough();

const adminMaterialsSchema = z.object({
  title: z.string().optional(),
  dept: z.string().optional(),
  year: z.union([z.number(), z.string()]).optional(),
  semester: z.union([z.number(), z.string()]).optional()
}).passthrough();

module.exports = {
  z,
  validate,
  // Auth schemas
  loginSchema,
  registerSchema,
  // Student schemas
  genericPostSchema,
  attendanceMarkSchema,
  leaveSchema,
  feePaySchema,
  scholarshipApplySchema,
  counselingSchema,
  wellnessSchema,
  chatMessageSchema,
  socialPostSchema,
  forumTopicSchema,
  forumReplySchema,
  aiEngineSchema,
  aiKernelExecuteSchema,
  aiChatSchema,
  aiDoubtSchema,
  ragQuerySchema,
  personalQuerySchema,
  quizFlashcardsSchema,
  ticketTriageSchema,
  assignmentGradeSchema,
  plannerTaskSchema,
  complaintsSchema,
  maintenanceSchema,
  helpdeskSchema,
  walletTopupSchema,
  cafeteriaOrderSchema,
  profileUpdateSchema,
  parkingVehicleSchema,
  // Admin schemas
  adminStudentSchema,
  adminAttendanceOverrideSchema,
  adminMarksUpdateSchema,
  adminNoticeSchema,
  adminMaterialsSchema
};

