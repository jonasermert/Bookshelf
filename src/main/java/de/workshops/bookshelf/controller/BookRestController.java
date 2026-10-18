package de.workshops.bookshelf.controller;

import de.workshops.bookshelf.entity.Book;
import de.workshops.bookshelf.entity.BookSearchRequest;
import de.workshops.bookshelf.exception.BookException;
import de.workshops.bookshelf.sevice.BookService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import javax.validation.Valid;
import java.net.URI;
import java.util.List;

@RestController
@RequestMapping(BookRestController.REQUEST_URL)
@RequiredArgsConstructor
@Transactional
public class BookRestController {
    public static final String REQUEST_URL = "/book";
    private final BookService bookService;

    @GetMapping
    public ResponseEntity<List<Book>> getAllBooks() {
        List<Book> books = bookService.getBooks();
        return books == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(books);
    }

    @GetMapping("/{isbn}")
    public Book getSingleBook(@PathVariable String isbn) throws BookException {
        return bookService.getSingleBook(isbn);
    }

    @GetMapping(params = "author")
    public Book searchBookByAuthor(@RequestParam String author) throws BookException {
        return bookService.searchBookByAuthor(author);
    }

    @PostMapping("/search")
    public List<Book> searchBooks(@RequestBody BookSearchRequest request) {
        return bookService.searchBooks(request);
    }

    @PostMapping
    public ResponseEntity<Book> createBook(@Valid @RequestBody Book book) {
        if (bookService.getBooks().stream().anyMatch(existing -> existing.getIsbn().equals(book.getIsbn().strip()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Diese ISBN ist bereits vorhanden.");
        }
        // Der Client darf beim Anlegen keine bestehende ID überschreiben.
        book.setId(null);
        normalize(book);
        Book created = bookService.createBook(book);
        return ResponseEntity.created(URI.create("/book/" + created.getIsbn().replace(" ", "%20"))).body(created);
    }

    @PutMapping("/{isbn}")
    public Book updateBook(@PathVariable String isbn, @Valid @RequestBody Book input) throws BookException {
        Book existing = bookService.getSingleBook(isbn);
        String newIsbn = input.getIsbn().strip();
        if (bookService.getBooks().stream().anyMatch(book ->
                !book.getId().equals(existing.getId()) && book.getIsbn().equals(newIsbn))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Diese ISBN ist bereits vorhanden.");
        }
        existing.setTitle(input.getTitle());
        existing.setAuthor(input.getAuthor());
        existing.setDescription(input.getDescription());
        existing.setIsbn(newIsbn);
        normalize(existing);
        return bookService.createBook(existing);
    }

    @DeleteMapping("/{isbn}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBook(@PathVariable String isbn) throws BookException {
        bookService.deleteBook(bookService.getSingleBook(isbn));
    }

    private void normalize(Book book) {
        book.setTitle(book.getTitle().strip());
        book.setAuthor(book.getAuthor().strip());
        book.setIsbn(book.getIsbn().strip());
        book.setDescription(book.getDescription() == null ? "" : book.getDescription().strip());
    }

    @ExceptionHandler(BookException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public java.util.Map<String, String> missing() {
        return java.util.Map.of("message", "Das Buch wurde nicht gefunden.");
    }
}
