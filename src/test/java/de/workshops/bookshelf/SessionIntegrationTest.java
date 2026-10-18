package de.workshops.bookshelf;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SessionIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    @Test
    void logsInUpdatesLastLoginAndLogsOut() throws Exception {
        mvc.perform(get("/api/session")).andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(false));
        mvc.perform(get("/api/csrf")).andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString());
        MockHttpSession session = (MockHttpSession) mvc.perform(post("/api/login").with(csrf())
                .param("username", "dbUser").param("password", "workshops"))
                .andExpect(status().isNoContent()).andReturn().getRequest().getSession(false);
        assertThat(session).isNotNull();
        assertThat(jdbc.queryForObject("SELECT lastlogin FROM bookshelf_user WHERE username = 'dbUser'", Object.class)).isNotNull();
        mvc.perform(get("/api/session").session(session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("dbUser"))
                .andExpect(jsonPath("$.authenticated").value(true));
        mvc.perform(post("/api/logout").session(session).with(csrf())).andExpect(status().isNoContent());
        assertThat(session.isInvalid()).isTrue();
        mvc.perform(get("/book")).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsWrongAndUnknownCredentials() throws Exception {
        for (String username : new String[] { "dbUser", "unbekannt" }) {
            mvc.perform(post("/api/login").with(csrf()).param("username", username).param("password", "falsch"))
                    .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").exists());
        }
    }
}
