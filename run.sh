#!/bin/bash

npm install && npm run build

while ! npm run start
do
	echo "Node crashed; restarting..."
	sleep 1
done

exho "Node exited normally"
