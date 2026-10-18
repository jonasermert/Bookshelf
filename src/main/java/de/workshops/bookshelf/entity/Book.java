package de.workshops.bookshelf.entity;

import lombok.*;

import javax.persistence.*;
import javax.validation.constraints.*;
import java.util.List;
import java.util.Objects;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Bitte einen Titel eingeben.")
    @Size(max = 255)
    private String title;

    @Column(length = 1000)
    @Size(max = 1000, message = "Die Beschreibung darf höchstens 1000 Zeichen enthalten.")
    private String description;

    @NotBlank(message = "Bitte einen Autor eingeben.")
    @Size(max = 255)
    private String author;

    @NotBlank(message = "Bitte eine ISBN eingeben.")
    @Pattern(regexp = "[0-9Xx -]{10,32}", message = "Bitte eine ISBN mit 10 bis 32 Zeichen eingeben (Ziffern, X, Leerzeichen und Bindestriche).")
    private String isbn;
}
