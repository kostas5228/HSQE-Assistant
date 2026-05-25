package com.hsqe.hsqe_assistant_backend.repositories;

import com.hsqe.hsqe_assistant_backend.entities.NotesEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotesRepository extends JpaRepository<NotesEntity, Long> {
}
