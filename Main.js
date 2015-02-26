// Global Variables............................................................

var introduction = [
	"The smell of gasoline meets you as you step outside ",
	"What do you do?",
];

var canvas_width = 800;
var canvas_height = 600;
var context = null;

var start_time = null;
var cursor_flicker_time = 0;

// User Command Line...........................................................

function clamp(value, minimum, maximum) {
	if (value < minimum)
		return minimum;
	else if (value > maximum)
		return maximum;
	return value;
}

function CommandLine() {
	this.text = [];
	this.max_characters = 60;
	this.cursor = 0;
	
	this.set_cursor = function(index) {
		var clamped = clamp(index, 0, this.max_characters - 1);
		this.cursor = Math.floor(clamped);
	}
	
	this.shift_cursor = function(offset) {
		var position = this.cursor + offset;
		this.set_cursor(position);
	};
	
	this.insert_character = function(character) {
		// shift all characters above the cursor position one index right
		var start = this.cursor;
		var end = this.max_characters - 1;
		for (var i = end; i > start; --i) {
			this.text[i] = this.text[i - 1];
		}

		this.text[this.cursor] = character;
		this.shift_cursor(1);
	};
	
	this.backspace = function() {
		this.shift_cursor(-1);
		this.delete_character();
	}
	
	this.delete_character = function() {
		// shift all characters above the cursor position one index left
		// and overwrite the character to remove
		var end = this.max_characters - 1;
		for (var i = this.cursor; i < end; ++i) {
			this.text[i] = this.text[i + 1];
		}
		this.text[end] = " ";
	}
	
	this.clear_line = function() {
		for (var i = 0, n = this.text.length; i < n; ++i) {
			this.text[i] = " ";
		}
		this.set_cursor(0);
	}
}

var user_command = new CommandLine();

// Input Handlers..............................................................

function get_keypress_character(event) {
	if (event.which == null) {
		return String.fromCharCode(event.keyCode); // IE
	} else if (event.which != 0 && event.charCode != 0) {
		return String.fromCharCode(event.which);
	} else {
		return null;
	}
}

function keypress_handler(event) {
	var character = get_keypress_character(event);
	if (character && character.search(/[a-z0-9 .?!:;'"]/i) >= 0) {
		user_command.insert_character(character);
	}
}

function keydown_handler(event) {
	switch (event.keyCode) {
		case 8: { // Backspace
			user_command.backspace();
			// Chrome uses backspace as a hotkey for the browser's Back button
			// and having the page unload when the user is trying to type a
			// command is no good, so cancel the key event before that happens
			event.preventDefault();
		} break;
			
		case 13: // Enter
			// process_command(user_command.text);
			user_command.clear_line();
			break;
		case 35: // End
			user_command.set_cursor(user_command.max_characters - 1);
			break;
		case 36: // Home
			user_command.set_cursor(0);
			break;
		case 37: // Left Arrow
			user_command.shift_cursor(-1);
			break;
		case 39: // Right Arrow
			user_command.shift_cursor(1);
			break;
		case 46: // Delete
			user_command.delete_character();
			break;
	}
}

// Drawing Functions...........................................................

function draw_text(context, text) {
	
}

// Game Functions..............................................................

function game_loop(timestamp) {
	var delta_time = timestamp - start_time;
	start_time = timestamp;
	
	var command_text = user_command.text.join("");
	var cursor_position = user_command.cursor;
	
	// Update game state
	{
		cursor_flicker_time += delta_time;
	}
	
	// Draw
	{
		context.clearRect(0, 0, canvas_width, canvas_height);
		
		var command_box_x = 16;
		var command_box_y = canvas_height - 16;
		
		var letter_width = 8.8;
		var letter_height = 16;
		
		// draw command text
		{
			context.font = "16px monospace";
			context.fillStyle = "rgb(255, 255, 255)";
			context.fillText(">", command_box_x - letter_width, command_box_y);
			context.fillText(command_text, command_box_x, command_box_y);
		}
		
		// draw cursor when it's flickered on
		var one_second = 1000;
		if (cursor_flicker_time % one_second < one_second / 2) {
			var x = command_box_x + letter_width * cursor_position;
			var y = command_box_y - letter_height;
			context.fillRect(x, y, letter_width, letter_height);
		}
	}
	
	window.requestAnimationFrame(game_loop);
}

function run_game(canvas_ID) {
	var canvas = document.getElementById(canvas_ID);
	canvas_width = canvas.width;
	canvas_height = canvas.height;
	
	context = canvas.getContext('2d');
	if (context) {
		window.requestAnimationFrame(game_loop);
	}
	
	canvas.addEventListener("keypress", keypress_handler);
	canvas.addEventListener("keydown", keydown_handler);
}