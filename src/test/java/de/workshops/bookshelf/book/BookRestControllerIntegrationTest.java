package de.workshops.bookshelf.book;

import de.workshops.bookshelf.repository.BookRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class BookRestControllerIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired BookRepository repository;

    private static final String BOOK = "{\"title\":\"Domain-Driven Design\",\"author\":\"Eric Evans\",\"isbn\":\"978-0321125217\",\"description\":\"Softwareentwurf\"}";

    @Test
    @WithMockUser
    void listsSeededBooks() throws Exception {
        mvc.perform(get("/book")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[1].title").value("Clean Code"));
        mvc.perform(get("/book/978-0201633610")).andExpect(status().isOk())
                .andExpect(jsonPath("$.author").value("Erich Gamma"));
        mvc.perform(get("/book").param("author", "Gamma")).andExpect(status().isOk());
        mvc.perform(post("/book/search").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"author\":\"Gamma\",\"isbn\":\"978-0201633610\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @WithMockUser
    void createsUpdatesAndDeletesBookWithoutOverwritingAnExistingId() throws Exception {
        String input = BOOK.replace("{", "{\"id\":1,");
        mvc.perform(post("/book").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(input))
                .andExpect(status().isCreated()).andExpect(header().string("Location", "/book/978-0321125217"));
        assertThat(repository.findByIsbn("978-0321125217").getId()).isNotEqualTo(1L);
        mvc.perform(put("/book/978-0321125217").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(BOOK.replace("Softwareentwurf", "Überarbeitet").replace("978-0321125217", "978-0321125218")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.description").value("Überarbeitet"));
        mvc.perform(get("/book/978-0321125217")).andExpect(status().isNotFound());
        mvc.perform(delete("/book/978-0321125218").with(csrf())).andExpect(status().isNoContent());
        mvc.perform(delete("/book/978-0321125218").with(csrf())).andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void validatesInputAndRejectsDuplicateIsbn() throws Exception {
        mvc.perform(post("/book").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\" \",\"author\":\"\",\"isbn\":\"abc\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.title").exists())
                .andExpect(jsonPath("$.fields.isbn").exists());
        mvc.perform(post("/book").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(BOOK))
                .andExpect(status().isCreated());
        mvc.perform(post("/book").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(BOOK))
                .andExpect(status().isConflict());
        mvc.perform(put("/book/978-3826655487").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(BOOK))
                .andExpect(status().isConflict());
    }

    @Test
    void requiresAuthenticationAndRetainsHttpBasic() throws Exception {
        mvc.perform(get("/book")).andExpect(status().isUnauthorized());
        mvc.perform(get("/book").with(httpBasic("dbUser", "workshops"))).andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void requiresCsrfForMutations() throws Exception {
        mvc.perform(post("/book").contentType(MediaType.APPLICATION_JSON).content(BOOK))
                .andExpect(status().isForbidden());
    }
}
