package com.hsqe.hsqe_assistant_backend.services;

import com.hsqe.hsqe_assistant_backend.domain.Task;
import com.hsqe.hsqe_assistant_backend.entities.TaskEntity;
import com.hsqe.hsqe_assistant_backend.mappers.TaskMapper;
import com.hsqe.hsqe_assistant_backend.repositories.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class TaskService {
    private final TaskRepository taskRepository;
    private final TaskMapper taskMapper;
    private static final Logger log = LoggerFactory.getLogger(TaskService.class);

    public TaskService(TaskRepository taskRepository, TaskMapper taskMapper) {
        this.taskRepository = taskRepository;
        this.taskMapper = taskMapper;
    }

    public List<Task> getAllTasks() {
        log.info("Fetching all tasks");
        return taskRepository.findAll().stream()
                .map(taskMapper::toDomainEntity)
                .toList();
    }

    public Optional<Task> getTaskById(Long id) {
        return taskRepository.findById(id).map(taskMapper::toDomainEntity);
    }

    @Transactional
    public Task saveTask(Task task) {
        log.debug("Saving task: {}", task);
        TaskEntity entity = taskMapper.toEntity(task);
        TaskEntity saved = taskRepository.save(entity);
        return taskMapper.toDomainEntity(saved);
    }

    @Transactional
    public void deleteTask(Long id) {
        log.warn("Deleting task with id: {}", id);
        taskRepository.deleteById(id);
    }
}
