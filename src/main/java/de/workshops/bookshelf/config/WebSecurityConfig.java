package de.workshops.bookshelf.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import java.util.Collections;

@Configuration
@RequiredArgsConstructor
public class WebSecurityConfig {
    private final JdbcTemplate jdbcTemplate;

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http.authorizeRequests(authorize -> authorize
                    .antMatchers("/", "/index.html", "/assets/**", "/favicon.svg",
                            "/api/session", "/api/csrf", "/api/login", "/error").permitAll()
                    .anyRequest().authenticated())
                .exceptionHandling(errors -> errors.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .httpBasic(basic -> basic.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .formLogin(login -> login.loginPage("/").loginProcessingUrl("/api/login")
                    .successHandler((request, response, authentication) -> {
                        jdbcTemplate.update("UPDATE bookshelf_user SET lastlogin = CURRENT_TIMESTAMP WHERE username = ?",
                                authentication.getName());
                        response.setStatus(204);
                    })
                    .failureHandler((request, response, exception) -> {
                        response.setStatus(401);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"message\":\"Benutzername oder Passwort ist falsch.\"}");
                    }))
                .logout(logout -> logout.logoutUrl("/api/logout")
                    .logoutSuccessHandler((request, response, authentication) -> response.setStatus(204)))
                .build();
    }

    @Bean
    public UserDetailsService userDetailsService() {
        return username -> {
            var users = jdbcTemplate.query("SELECT * FROM bookshelf_user WHERE username = ?", (rs, rowNum) ->
                new User(rs.getString("username"), rs.getString("password"),
                    Collections.singletonList(new SimpleGrantedAuthority(rs.getString("role")))), username);
            if (users.isEmpty()) throw new UsernameNotFoundException("Benutzer nicht gefunden.");
            return users.get(0);
        };
    }

    @Bean
    public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
}
