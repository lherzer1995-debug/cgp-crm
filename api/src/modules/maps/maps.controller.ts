import { Controller, Get, Query } from "@nestjs/common";
import { MapsService } from "./maps.service";

@Controller("maps")
export class MapsController {
  constructor(private svc: MapsService) {}

  @Get("customers")
  getCustomerMarkers() {
    return this.svc.getCustomerMarkers();
  }

  @Get("route")
  getRoute(@Query("origin") origin: string, @Query("destinations") destinations: string) {
    return this.svc.getOptimizedRoute(origin, destinations.split(","));
  }
}
