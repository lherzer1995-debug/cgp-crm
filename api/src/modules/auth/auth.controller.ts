import { Controller, Post, Body, HttpCode } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private svc: AuthService) {}

  @Post("webhook")
  @HttpCode(200)
  handleWebhook(@Body() body: any) {
    return this.svc.handleClerkWebhook(body);
  }
}
