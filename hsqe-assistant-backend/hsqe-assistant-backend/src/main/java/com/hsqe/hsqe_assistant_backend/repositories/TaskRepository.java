package com.hsqe.hsqe_assistant_backend.repositories;

import com.hsqe.hsqe_assistant_backend.entities.TaskEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TaskRepository extends JpaRepository<TaskEntity, Long> {
}
