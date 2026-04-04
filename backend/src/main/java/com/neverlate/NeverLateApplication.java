// Main entry point for the NeverLate Spring Boot application.
// Bootstraps the entire backend — Spring scans this package and all sub-packages
// to wire up controllers, services, repositories, and security configuration.
// Before Spring starts, dotenv-java loads .env.local from the project root and
// injects its values as system properties so application.properties can reference them.

package com.neverlate;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class NeverLateApplication {

    public static void main(String[] args) {
        Dotenv dotenv = Dotenv.configure()
                .filename(".env.local")
                .ignoreIfMissing()
                .load();
        dotenv.entries().forEach(e -> System.setProperty(e.getKey(), e.getValue()));

        SpringApplication.run(NeverLateApplication.class, args);
    }
}
