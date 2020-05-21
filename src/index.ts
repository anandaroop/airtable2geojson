import { Request, Response } from "express"

/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
export const helloWorld = (req: Request, res: Response) => {
  const message = req.query.message || req.body.message || "Hello World!"
  res.status(200).send(message)
}
