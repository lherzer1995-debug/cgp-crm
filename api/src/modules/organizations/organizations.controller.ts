import { Controller, Get, Post, Param, Body } from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
export class OrganizationsController {
  constructor(private svc: OrganizationsService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Get(":slug")
  findBySlug(@Param("slug") slug: string) {
    return this.svc.findBySlug(slug);
  }

  @Post()
  create(@Body() body: { name: string; slug: string }) {
    return this.svc.create(body);
  }
}
