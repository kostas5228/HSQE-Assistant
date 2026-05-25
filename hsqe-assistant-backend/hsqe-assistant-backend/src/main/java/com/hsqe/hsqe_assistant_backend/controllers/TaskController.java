package com.hsqe.hsqe_assistant_backend.controllers;

import com.hsqe.hsqe_assistant_backend.dto.TaskDTO;
import com.hsqe.hsqe_assistant_backend.domain.Task;
import com.hsqe.hsqe_assistant_backend.mappers.TaskMapper;
import com.hsqe.hsqe_assistant_backend.services.TaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(TaskController.class);
    private final TaskService taskService;
    private final TaskMapper taskMapper;

    public TaskController(TaskService taskService, TaskMapper taskMapper) {
        this.taskService = taskService;
        this.taskMapper = taskMapper;
    }

    @GetMapping
    public List<TaskDTO> getAllTasks() {
        log.info("API call: getAllTasks");
        return taskService.getAllTasks().stream()
                .map(taskMapper::toDTO)
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskDTO> getTaskById(@PathVariable Long id) {
        return taskService.getTaskById(id)
                .map(taskMapper::toDTO)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public TaskDTO createTask(@RequestBody TaskDTO taskDTO) {
        log.debug("API call: createTask with data: {}", taskDTO);
        Task saved = taskService.saveTask(taskMapper.toDomain(taskDTO));
        return taskMapper.toDTO(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskDTO> updateTask(@PathVariable Long id, @RequestBody TaskDTO taskDTO) {
        log.debug("API call: updateTask id={} data={}", id, taskDTO);
        return taskService.getTaskById(id)
                .map(existing -> {
                    taskDTO.setId(id);
                    Task saved = taskService.saveTask(taskMapper.toDomain(taskDTO));
                    return ResponseEntity.ok(taskMapper.toDTO(saved));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        log.warn("API call: deleteTask with id: {}", id);
        taskService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }
}
