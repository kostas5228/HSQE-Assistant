package com.hsqe.hsqe_assistant_backend.repositories;

import com.hsqe.hsqe_assistant_backend.entities.ContactEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ContactRepository extends JpaRepository<ContactEntity, Long> {
}
