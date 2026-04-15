package com.neverlate.controller;

@Controller
public class HomeController {
    @GetMapping("/")
    public String index() {
        return "index"; // This must match a file in src/main/resources/templates/index.html
    }
}
